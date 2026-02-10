import {
  generateEncryptionKey,
} from "@excalidraw/excalidraw/data/encryption";
import { isInvisiblySmallElement } from "@excalidraw/element";
import { bytesToHexString, UserIdleState } from "@excalidraw/common";

import type { SceneBounds } from "@excalidraw/element";
import type {
  OrderedExcalidrawElement,
  ExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  SocketId,
} from "@excalidraw/excalidraw/types";

import { DELETED_ELEMENT_TIMEOUT, ROOM_ID_BYTES } from "@/app_constants";

export type SyncableExcalidrawElement = OrderedExcalidrawElement & {
  _brand: "SyncableExcalidrawElement";
};

export const isSyncableElement = (
  element: OrderedExcalidrawElement,
): element is SyncableExcalidrawElement => {
  if (element.isDeleted) {
    return element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT;
  }
  return !isInvisiblySmallElement(element);
};

export const getSyncableElements = (
  elements: readonly OrderedExcalidrawElement[],
) =>
  elements.filter((element) =>
    isSyncableElement(element),
  ) as SyncableExcalidrawElement[];

const RE_COLLAB_LINK = /^#room=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/;
const RE_SHARE_LINK = /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/;

export const isCollaborationLink = (link: string) => {
  const hash = new URL(link).hash;
  return RE_COLLAB_LINK.test(hash);
};

export const getCollaborationLinkData = (link: string) => {
  const hash = new URL(link).hash;
  const match = hash.match(RE_COLLAB_LINK);
  return match ? { roomId: match[1], roomKey: match[2] } : null;
};

export const getShareLinkData = (link: string) => {
  const hash = new URL(link).hash;
  const match = hash.match(RE_SHARE_LINK);
  return match ? { shareId: match[1], shareKey: match[2] } : null;
};

const generateRoomId = async () => {
  const buffer = new Uint8Array(ROOM_ID_BYTES);
  window.crypto.getRandomValues(buffer);
  return bytesToHexString(buffer);
};

export const generateCollaborationLinkData = async () => {
  const roomId = await generateRoomId();
  const roomKey = await generateEncryptionKey("string");

  if (!roomKey) {
    throw new Error("Couldn't generate room key");
  }

  return { roomId, roomKey };
};

export const getCollaborationLink = (data: {
  roomId: string;
  roomKey: string;
}) => {
  return `${window.location.origin}${window.location.pathname}#room=${data.roomId},${data.roomKey}`;
};

export type SocketUpdateDataSource = {
  INVALID_RESPONSE: {
    type: "INVALID_RESPONSE";
  };
  SCENE_INIT: {
    type: "SCENE_INIT";
    payload: {
      elements: readonly OrderedExcalidrawElement[];
    };
  };
  SCENE_UPDATE: {
    type: "SCENE_UPDATE";
    payload: {
      elements: readonly OrderedExcalidrawElement[];
    };
  };
  MOUSE_LOCATION: {
    type: "MOUSE_LOCATION";
    payload: {
      socketId: SocketId;
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
      selectedElementIds: AppState["selectedElementIds"];
      username: string;
    };
  };
  USER_VISIBLE_SCENE_BOUNDS: {
    type: "USER_VISIBLE_SCENE_BOUNDS";
    payload: {
      socketId: SocketId;
      username: string;
      sceneBounds: SceneBounds;
    };
  };
  IDLE_STATUS: {
    type: "IDLE_STATUS";
    payload: {
      socketId: SocketId;
      userState: UserIdleState;
      username: string;
    };
  };
};

export type SocketUpdateDataIncoming =
  SocketUpdateDataSource[keyof SocketUpdateDataSource];

export type SocketUpdateData =
  SocketUpdateDataSource[keyof SocketUpdateDataSource] & {
    _brand: "socketUpdateData";
  };
