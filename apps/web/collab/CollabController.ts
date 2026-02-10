import {
  CaptureUpdateAction,
  getSceneVersion,
  reconcileElements,
  restoreElements,
} from "@excalidraw/excalidraw";
import { bumpElementVersions } from "@excalidraw/excalidraw/data/restore";
import { decryptData } from "@excalidraw/excalidraw/data/encryption";
import { isInitializedImageElement } from "@excalidraw/element";
import {
  ACTIVE_THRESHOLD,
  IDLE_THRESHOLD,
  UserIdleState,
  EVENT,
} from "@excalidraw/common";

import { throttle } from "@/lib/throttle";

import type {
  ReconciledExcalidrawElement,
  RemoteExcalidrawElement,
} from "@excalidraw/excalidraw/data/reconcile";
import type {
  ExcalidrawElement,
  FileId,
  InitializedExcalidrawImageElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  BinaryFileData,
  ExcalidrawImperativeAPI,
  SocketId,
  Collaborator,
  Gesture,
} from "@excalidraw/excalidraw/types";

import {
  CURSOR_SYNC_TIMEOUT,
  FILE_UPLOAD_MAX_BYTES,
  INITIAL_SCENE_UPDATE_TIMEOUT,
  LOAD_IMAGES_TIMEOUT,
  SYNC_FULL_SCENE_INTERVAL_MS,
  WS_EVENTS,
  WS_SUBTYPES,
} from "@/app_constants";
import {
  generateCollaborationLinkData,
  getCollaborationLink,
  SocketUpdateDataSource,
} from "@/collab/data";
import {
  FileManager,
  encodeFilesForUpload,
  decodeFileFromStorage,
  updateStaleImageStatuses,
} from "@/collab/FileManager";
import Portal from "@/collab/Portal";

export type CollabState = {
  isCollaborating: boolean;
  isLeader: boolean;
  activeRoomLink: string | null;
  errorMessage: string | null;
  username: string;
};

export type CollabControllerOptions = {
  excalidrawAPI: ExcalidrawImperativeAPI;
  sceneId: string;
  onStateChange?: (state: CollabState) => void;
};

export class CollabController {
  portal: Portal;
  fileManager: FileManager;
  excalidrawAPI: ExcalidrawImperativeAPI;
  sceneId: string;
  captureUpdateNever = CaptureUpdateAction.NEVER;

  private socketInitializationTimer?: number;
  private lastBroadcastedOrReceivedSceneVersion = -1;
  private collaborators = new Map<SocketId, Collaborator>();
  private idleTimeoutId: number | null = null;
  private activeIntervalId: number | null = null;

  private state: CollabState = {
    isCollaborating: false,
    isLeader: false,
    activeRoomLink: null,
    errorMessage: null,
    username: "",
  };

  constructor(opts: CollabControllerOptions) {
    this.excalidrawAPI = opts.excalidrawAPI;
    this.sceneId = opts.sceneId;
    this.portal = new Portal(this);
    this.fileManager = new FileManager({
      getFiles: this.getFilesFromStorage.bind(this),
      saveFiles: this.saveFilesToStorage.bind(this),
    });
    this.onStateChange = opts.onStateChange;

    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.onOfflineStatusToggle = this.onOfflineStatusToggle.bind(this);
  }

  private onStateChange?: (state: CollabState) => void;

  private setState(patch: Partial<CollabState>) {
    this.state = { ...this.state, ...patch };
    this.onStateChange?.(this.state);
  }

  get username() {
    return this.state.username;
  }

  mount() {
    window.addEventListener(EVENT.BEFORE_UNLOAD, this.handleBeforeUnload);
    window.addEventListener("online", this.onOfflineStatusToggle);
    window.addEventListener("offline", this.onOfflineStatusToggle);
  }

  unmount() {
    window.removeEventListener(EVENT.BEFORE_UNLOAD, this.handleBeforeUnload);
    window.removeEventListener("online", this.onOfflineStatusToggle);
    window.removeEventListener("offline", this.onOfflineStatusToggle);
    this.stopCollaboration(false);
  }

  private handleBeforeUnload() {
    // no-op for now; collab server has no persistence responsibilities
  }

  private onOfflineStatusToggle() {
    // placeholder for UI hooks; not wired to any state yet
  }

  isCollaborating = () => this.state.isCollaborating;

  isLeader = () => this.state.isLeader;

  setUsername = (username: string) => {
    this.setState({ username });
  };

  getUsername = () => this.state.username;

  getActiveRoomLink = () => this.state.activeRoomLink;

  setErrorDialog = (errorMessage: string | null) => {
    this.setState({ errorMessage });
  };

  setActiveRoomLink = (activeRoomLink: string | null) => {
    this.setState({ activeRoomLink });
  };

  setIsCollaborating = (isCollaborating: boolean) => {
    this.setState({ isCollaborating });
  };

  setIsLeader = (isLeader: boolean) => {
    this.setState({ isLeader });
  };

  startCollaboration = async (
    existingRoomLinkData: null | { roomId: string; roomKey: string },
  ) => {
    try {
      if (!this.state.username) {
        import("@excalidraw/random-username").then(({ getRandomUsername }) => {
          this.setUsername(getRandomUsername());
        });
      }

      if (this.portal.socket) {
        return null;
      }

      let roomId: string;
      let roomKey: string;

      if (existingRoomLinkData) {
        ({ roomId, roomKey } = existingRoomLinkData);
      } else {
        const roomRes = await fetch("/api/collab/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sceneId: this.sceneId }),
        });
        const roomJson = await roomRes.json();
        if (!roomRes.ok || !roomJson.roomId) {
          throw new Error(roomJson?.error || "Failed to create collab room");
        }
        roomId = roomJson.roomId;
        ({ roomKey } = await generateCollaborationLinkData());
        window.history.pushState(
          {},
          document.title,
          getCollaborationLink({ roomId, roomKey }),
        );
      }

      const { default: socketIOClient } = await import("socket.io-client");
      const serverUrl = process.env.NEXT_PUBLIC_COLLAB_SERVER_URL;
      if (!serverUrl) {
        throw new Error("Missing NEXT_PUBLIC_COLLAB_SERVER_URL");
      }

      this.portal.socket = this.portal.open(
        socketIOClient(serverUrl, {
          transports: ["websocket", "polling"],
        }),
        roomId,
        roomKey,
      );

      this.setIsCollaborating(true);
    } catch (error: any) {
      this.setIsCollaborating(false);
      this.setIsLeader(false);
      this.setActiveRoomLink(null);
      this.setErrorDialog(error?.message || "Failed to start collaboration");
      return null;
    }

    // fallback if INIT never arrives
    this.socketInitializationTimer = window.setTimeout(() => {
      this.portal.socketInitialized = true;
    }, INITIAL_SCENE_UPDATE_TIMEOUT);

    this.portal.socket.on(
      "client-broadcast",
      async (encryptedData: ArrayBuffer, iv: Uint8Array<ArrayBuffer>) => {
        if (!this.portal.roomKey) return;
        const decryptedData = await this.decryptPayload(
          iv,
          encryptedData,
          this.portal.roomKey,
        );

        switch (decryptedData.type) {
          case WS_SUBTYPES.INVALID_RESPONSE:
            return;
          case WS_SUBTYPES.INIT: {
            if (!this.portal.socketInitialized) {
              this.portal.socketInitialized = true;
              const remoteElements =
                decryptedData.payload.elements as readonly RemoteExcalidrawElement[];
              const reconciledElements =
                this._reconcileElements(remoteElements);
              this.handleRemoteSceneUpdate(reconciledElements);
            }
            break;
          }
          case WS_SUBTYPES.UPDATE:
            this.handleRemoteSceneUpdate(
              this._reconcileElements(
                decryptedData.payload.elements as readonly RemoteExcalidrawElement[],
              ),
            );
            break;
          case WS_SUBTYPES.MOUSE_LOCATION: {
            const { pointer, button, username, selectedElementIds } =
              decryptedData.payload;

            const socketId =
              decryptedData.payload.socketId ||
              // @ts-ignore legacy
              decryptedData.payload.socketID;

            this.updateCollaborator(socketId, {
              pointer,
              button,
              selectedElementIds,
              username,
            });
            break;
          }
          case WS_SUBTYPES.IDLE_STATUS: {
            const { userState, socketId, username } = decryptedData.payload;
            this.updateCollaborator(socketId, {
              userState,
              username,
            });
            break;
          }
          default:
            return;
        }
      },
    );

    this.portal.socket.on("first-in-room", async () => {
      this.setIsLeader(true);
    });

    this.setActiveRoomLink(window.location.href);

    this.initializeIdleDetector();
  };

  stopCollaboration = (keepRemoteState = true) => {
    this.queueBroadcastAllElements.cancel();
    this.loadImageFiles.cancel();
    this.teardownIdleDetector();

    if (keepRemoteState) {
      if (
        typeof window !== "undefined" &&
        window.location.hash.startsWith("#room=")
      ) {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.pushState({}, document.title, url.toString());
      }
    }

    if (!keepRemoteState) {
      this.destroySocketClient();
      return;
    }

    this.destroySocketClient();
  };

  private destroySocketClient = () => {
    this.lastBroadcastedOrReceivedSceneVersion = -1;
    this.portal.close();
    this.fileManager.reset();
    this.setIsCollaborating(false);
    this.setIsLeader(false);
    this.setActiveRoomLink(null);
    this.collaborators = new Map();
    this.excalidrawAPI.updateScene({
      collaborators: this.collaborators,
    });
  };

  private decryptPayload = async (
    iv: Uint8Array<ArrayBuffer>,
    encryptedData: ArrayBuffer,
    decryptionKey: string,
  ): Promise<SocketUpdateDataSource[keyof SocketUpdateDataSource]> => {
    try {
      const decrypted = await decryptData(iv, encryptedData, decryptionKey);
      const decodedData = new TextDecoder("utf-8").decode(
        new Uint8Array(decrypted),
      );
      return JSON.parse(decodedData);
    } catch (error) {
      return {
        type: WS_SUBTYPES.INVALID_RESPONSE,
      };
    }
  };

  private _reconcileElements = (
    remoteElements: readonly RemoteExcalidrawElement[],
  ): ReconciledExcalidrawElement[] => {
    const appState = this.excalidrawAPI.getAppState();
    const existingElements = this.getSceneElementsIncludingDeleted();

    remoteElements = restoreElements(remoteElements, existingElements);

    let reconciledElements = reconcileElements(
      existingElements,
      remoteElements,
      appState,
    );

    reconciledElements = bumpElementVersions(
      reconciledElements,
      existingElements,
    );

    this.setLastBroadcastedOrReceivedSceneVersion(
      getSceneVersion(reconciledElements),
    );

    return reconciledElements;
  };

  private loadImageFiles = throttle(async () => {
    const { loadedFiles, erroredFiles } = await this.fetchImageFilesFromStorage({
      elements: this.excalidrawAPI.getSceneElementsIncludingDeleted(),
    });

    this.excalidrawAPI.addFiles(loadedFiles);

    updateStaleImageStatuses({
      excalidrawAPI: this.excalidrawAPI,
      erroredFiles,
      elements: this.excalidrawAPI.getSceneElementsIncludingDeleted(),
    });
  }, LOAD_IMAGES_TIMEOUT);

  private handleRemoteSceneUpdate = (
    elements: ReconciledExcalidrawElement[],
  ) => {
    this.excalidrawAPI.updateScene({
      elements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    this.loadImageFiles();
  };

  setCollaborators(sockets: SocketId[]) {
    const collaborators: Map<SocketId, Collaborator> = new Map();
    for (const socketId of sockets) {
      collaborators.set(
        socketId,
        Object.assign({}, this.collaborators.get(socketId), {
          isCurrentUser: socketId === this.portal.socket?.id,
        }),
      );
    }
    this.collaborators = collaborators;
    this.excalidrawAPI.updateScene({ collaborators });
  }

  updateCollaborator = (socketId: SocketId, updates: Partial<Collaborator>) => {
    const collaborators = new Map(this.collaborators);
    const user: Collaborator = Object.assign({}, collaborators.get(socketId), {
      ...updates,
      isCurrentUser: socketId === this.portal.socket?.id,
    });
    collaborators.set(socketId, user);
    this.collaborators = collaborators;

    this.excalidrawAPI.updateScene({ collaborators });
  };

  public setLastBroadcastedOrReceivedSceneVersion = (version: number) => {
    this.lastBroadcastedOrReceivedSceneVersion = version;
  };

  public getLastBroadcastedOrReceivedSceneVersion = () => {
    return this.lastBroadcastedOrReceivedSceneVersion;
  };

  public getSceneElementsIncludingDeleted = () => {
    return this.excalidrawAPI.getSceneElementsIncludingDeleted();
  };

  onPointerUpdate = throttle(
    (payload: {
      pointer: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["pointer"];
      button: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["button"];
      pointersMap: Gesture["pointers"];
    }) => {
      payload.pointersMap.size < 2 &&
        this.portal.socket &&
        this.portal.broadcastMouseLocation(payload);
    },
    CURSOR_SYNC_TIMEOUT,
  );

  broadcastElements = (elements: readonly OrderedExcalidrawElement[]) => {
    if (
      getSceneVersion(elements) >
      this.getLastBroadcastedOrReceivedSceneVersion()
    ) {
      this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false);
      this.lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);
      this.queueBroadcastAllElements();
    }
  };

  syncElements = (elements: readonly OrderedExcalidrawElement[]) => {
    this.broadcastElements(elements);
  };

  queueBroadcastAllElements = throttle(() => {
    this.portal.broadcastScene(
      WS_SUBTYPES.UPDATE,
      this.excalidrawAPI.getSceneElementsIncludingDeleted(),
      true,
    );
    const currentVersion = this.getLastBroadcastedOrReceivedSceneVersion();
    const newVersion = Math.max(
      currentVersion,
      getSceneVersion(this.getSceneElementsIncludingDeleted()),
    );
    this.setLastBroadcastedOrReceivedSceneVersion(newVersion);
  }, SYNC_FULL_SCENE_INTERVAL_MS);

  private onPointerMove = () => {
    if (this.idleTimeoutId) {
      window.clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }

    this.idleTimeoutId = window.setTimeout(this.reportIdle, IDLE_THRESHOLD);

    if (!this.activeIntervalId) {
      this.activeIntervalId = window.setInterval(
        this.reportActive,
        ACTIVE_THRESHOLD,
      );
    }
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      if (this.idleTimeoutId) {
        window.clearTimeout(this.idleTimeoutId);
        this.idleTimeoutId = null;
      }
      if (this.activeIntervalId) {
        window.clearInterval(this.activeIntervalId);
        this.activeIntervalId = null;
      }
      this.onIdleStateChange(UserIdleState.AWAY);
    } else {
      this.idleTimeoutId = window.setTimeout(this.reportIdle, IDLE_THRESHOLD);
      this.activeIntervalId = window.setInterval(
        this.reportActive,
        ACTIVE_THRESHOLD,
      );
      this.onIdleStateChange(UserIdleState.ACTIVE);
    }
  };

  private reportIdle = () => {
    this.onIdleStateChange(UserIdleState.IDLE);
    if (this.activeIntervalId) {
      window.clearInterval(this.activeIntervalId);
      this.activeIntervalId = null;
    }
  };

  private reportActive = () => {
    this.onIdleStateChange(UserIdleState.ACTIVE);
  };

  private initializeIdleDetector = () => {
    document.addEventListener(EVENT.POINTER_MOVE, this.onPointerMove);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, this.onVisibilityChange);
  };

  private teardownIdleDetector = () => {
    document.removeEventListener(EVENT.POINTER_MOVE, this.onPointerMove);
    document.removeEventListener(EVENT.VISIBILITY_CHANGE, this.onVisibilityChange);
    if (this.idleTimeoutId) {
      window.clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    if (this.activeIntervalId) {
      window.clearInterval(this.activeIntervalId);
      this.activeIntervalId = null;
    }
  };

  onIdleStateChange = (userState: UserIdleState) => {
    this.portal.broadcastIdleChange(userState);
  };

  private async saveFilesToStorage({
    addedFiles,
  }: {
    addedFiles: Map<FileId, BinaryFileData>;
  }) {
    const { roomId, roomKey } = this.portal;
    if (!roomId || !roomKey) {
      throw new Error("Room not initialized");
    }

    const filesToUpload = await encodeFilesForUpload({
      files: addedFiles,
      encryptionKey: roomKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    const savedFiles = new Map<FileId, BinaryFileData>();
    const erroredFiles = new Map<FileId, BinaryFileData>();

    await Promise.all(
      filesToUpload.map(async ({ id, buffer }) => {
        try {
          const bodyBuffer = new ArrayBuffer(buffer.byteLength);
          new Uint8Array(bodyBuffer).set(buffer);
          const res = await fetch(
            `/api/collab/files?roomId=${roomId}&fileId=${id}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body: bodyBuffer,
            },
          );
          if (!res.ok) {
            throw new Error("Upload failed");
          }
          const fileData = addedFiles.get(id);
          if (fileData) {
            savedFiles.set(id, fileData);
          }
        } catch (err) {
          const fileData = addedFiles.get(id);
          if (fileData) {
            erroredFiles.set(id, fileData);
          }
        }
      }),
    );

    return { savedFiles, erroredFiles };
  }

  private async getFilesFromStorage(fileIds: FileId[]) {
    const { roomId, roomKey } = this.portal;
    if (!roomId || !roomKey) {
      throw new Error("Room not initialized");
    }

    const loadedFiles: BinaryFileData[] = [];
    const erroredFiles = new Map<FileId, true>();

    await Promise.all(
      fileIds.map(async (fileId) => {
        try {
          const metaRes = await fetch(
            `/api/collab/files?roomId=${roomId}&fileId=${fileId}`,
          );
          if (!metaRes.ok) {
            throw new Error("Fetch failed");
          }
          const meta = await metaRes.json();
          const fileRes = await fetch(meta.url);
          if (!fileRes.ok) {
            throw new Error("Fetch failed");
          }
          const buffer = new Uint8Array(await fileRes.arrayBuffer());
          const decoded = await decodeFileFromStorage({
            buffer,
            decryptionKey: roomKey,
          });
          loadedFiles.push(decoded);
        } catch (err) {
          erroredFiles.set(fileId, true);
        }
      }),
    );

    return { loadedFiles, erroredFiles };
  }

  private fetchImageFilesFromStorage = async (opts: {
    elements: readonly ExcalidrawElement[];
    forceFetchFiles?: boolean;
  }) => {
    const unfetchedImages = opts.elements
      .filter((element) => {
        return (
          isInitializedImageElement(element) &&
          !this.fileManager.isFileTracked(element.fileId) &&
          !element.isDeleted &&
          (opts.forceFetchFiles
            ? element.status !== "pending" ||
              Date.now() - element.updated > 10000
            : element.status === "saved")
        );
      })
      .map((element) => (element as InitializedExcalidrawImageElement).fileId);

    return await this.fileManager.getFiles(unfetchedImages);
  };
}

export type CollabAPI = Pick<
  CollabController,
  | "startCollaboration"
  | "stopCollaboration"
  | "getActiveRoomLink"
  | "getUsername"
  | "setUsername"
  | "isCollaborating"
>;
