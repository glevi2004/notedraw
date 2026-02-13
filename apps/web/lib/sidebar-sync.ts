const WORKSPACE_VISUALS_UPDATED_EVENT = "notedraw:workspace-visuals-updated";
const USER_VISUALS_UPDATED_EVENT = "notedraw:user-visuals-updated";

const WORKSPACE_VISUALS_STORAGE_KEY = "notedraw.workspace.visuals.updatedAt";
const USER_VISUALS_STORAGE_KEY = "notedraw.user.visuals.updatedAt";

type BroadcastPayload = Record<string, unknown>;

function broadcast(
  eventName: string,
  storageKey: string,
  detail: BroadcastPayload,
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    ...detail,
    updatedAt: Date.now(),
  };

  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // localStorage can be unavailable in private browsing modes
  }
}

export function notifyWorkspaceVisualsUpdated(workspaceId?: string | null) {
  broadcast(WORKSPACE_VISUALS_UPDATED_EVENT, WORKSPACE_VISUALS_STORAGE_KEY, {
    workspaceId: workspaceId ?? null,
  });
}

export function notifyUserVisualsUpdated(userId?: string | null) {
  broadcast(USER_VISUALS_UPDATED_EVENT, USER_VISUALS_STORAGE_KEY, {
    userId: userId ?? null,
  });
}

export const sidebarSync = {
  workspaceEvent: WORKSPACE_VISUALS_UPDATED_EVENT,
  userEvent: USER_VISUALS_UPDATED_EVENT,
  workspaceStorageKey: WORKSPACE_VISUALS_STORAGE_KEY,
  userStorageKey: USER_VISUALS_STORAGE_KEY,
} as const;
