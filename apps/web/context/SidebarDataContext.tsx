"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { sidebarSync } from "@/lib/sidebar-sync";

const WORKSPACE_CACHE_TTL_MS = 60_000;
const USER_RELOAD_TTL_MS = 60_000;

export interface SidebarWorkspace {
  id: string;
  name: string;
  logoUrl?: string | null;
  role?: "VIEWER" | "MEMBER" | "ADMIN" | null;
}

interface SidebarDataContextValue {
  workspaces: SidebarWorkspace[];
  isWorkspacesLoading: boolean;
  refreshWorkspaces: (options?: { force?: boolean }) => Promise<void>;
  userName: string;
  userEmail: string;
  userImageUrl: string | null;
  reloadUser: (options?: { force?: boolean }) => Promise<void>;
}

const SidebarDataContext = createContext<SidebarDataContextValue | undefined>(
  undefined,
);

export function SidebarDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;
  const userReload = user?.reload;
  const [workspaces, setWorkspaces] = useState<SidebarWorkspace[]>([]);
  const [isWorkspacesLoading, setIsWorkspacesLoading] = useState(false);

  const mountedRef = useRef(true);
  const previousUserIdRef = useRef<string | null>(null);
  const workspacesRef = useRef<SidebarWorkspace[]>([]);
  const workspacesRequestRef = useRef<Promise<void> | null>(null);
  const lastWorkspaceFetchAtRef = useRef(0);
  const userReloadRequestRef = useRef<Promise<void> | null>(null);
  const lastUserReloadAtRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (previousUserIdRef.current === userId) {
      return;
    }
    previousUserIdRef.current = userId;
    workspacesRef.current = [];
    lastWorkspaceFetchAtRef.current = 0;
    if (mountedRef.current) {
      setWorkspaces([]);
      setIsWorkspacesLoading(false);
    }
  }, [userId]);

  const refreshWorkspaces = useCallback(
    async (options?: { force?: boolean }) => {
      if (!isLoaded) {
        return;
      }
      if (!userId) {
        workspacesRef.current = [];
        lastWorkspaceFetchAtRef.current = 0;
        if (mountedRef.current) {
          setWorkspaces([]);
          setIsWorkspacesLoading(false);
        }
        return;
      }

      const force = options?.force ?? false;
      const now = Date.now();

      if (
        !force &&
        workspacesRef.current.length > 0 &&
        now - lastWorkspaceFetchAtRef.current < WORKSPACE_CACHE_TTL_MS
      ) {
        return;
      }

      if (workspacesRequestRef.current) {
        await workspacesRequestRef.current;
        return;
      }

      const request = (async () => {
        if (mountedRef.current) {
          setIsWorkspacesLoading(true);
        }
        try {
          const response = await fetch("/api/workspaces", { cache: "no-store" });
          if (!response.ok) {
            throw new Error("Failed to fetch workspaces");
          }
          const data = (await response.json()) as SidebarWorkspace[];
          workspacesRef.current = data;
          lastWorkspaceFetchAtRef.current = Date.now();
          if (mountedRef.current) {
            setWorkspaces(data);
          }
        } catch (error) {
          console.error("Error refreshing workspaces:", error);
        } finally {
          if (mountedRef.current) {
            setIsWorkspacesLoading(false);
          }
          workspacesRequestRef.current = null;
        }
      })();

      workspacesRequestRef.current = request;
      await request;
    },
    [isLoaded, userId],
  );

  const reloadUser = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false;
      if (!userReload || !userId) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastUserReloadAtRef.current < USER_RELOAD_TTL_MS) {
        return;
      }

      if (userReloadRequestRef.current) {
        await userReloadRequestRef.current;
        return;
      }

      const request = (async () => {
        try {
          await userReload();
          lastUserReloadAtRef.current = Date.now();
        } catch (error) {
          console.error("Error reloading user:", error);
        } finally {
          userReloadRequestRef.current = null;
        }
      })();

      userReloadRequestRef.current = request;
      await request;
    },
    [userId, userReload],
  );

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }
    void refreshWorkspaces({ force: true });
  }, [isLoaded, refreshWorkspaces, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onWorkspaceVisualsUpdated = () => {
      void refreshWorkspaces({ force: true });
    };
    const onUserVisualsUpdated = () => {
      void reloadUser({ force: true });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === sidebarSync.workspaceStorageKey) {
        void refreshWorkspaces({ force: true });
      }
      if (event.key === sidebarSync.userStorageKey) {
        void reloadUser({ force: true });
      }
    };
    const onFocus = () => {
      void refreshWorkspaces();
      void reloadUser();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void refreshWorkspaces();
      void reloadUser();
    };

    window.addEventListener(sidebarSync.workspaceEvent, onWorkspaceVisualsUpdated);
    window.addEventListener(sidebarSync.userEvent, onUserVisualsUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener(
        sidebarSync.workspaceEvent,
        onWorkspaceVisualsUpdated,
      );
      window.removeEventListener(sidebarSync.userEvent, onUserVisualsUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshWorkspaces, reloadUser]);

  const userName = user?.fullName || user?.username || "User";
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const userImageUrl = user?.imageUrl || null;

  const value = useMemo(
    () => ({
      workspaces,
      isWorkspacesLoading,
      refreshWorkspaces,
      userName,
      userEmail,
      userImageUrl,
      reloadUser,
    }),
    [
      isWorkspacesLoading,
      refreshWorkspaces,
      reloadUser,
      userEmail,
      userImageUrl,
      userName,
      workspaces,
    ],
  );

  return (
    <SidebarDataContext.Provider value={value}>
      {children}
    </SidebarDataContext.Provider>
  );
}

export function useSidebarData() {
  const context = useContext(SidebarDataContext);
  if (!context) {
    throw new Error("useSidebarData must be used within SidebarDataProvider");
  }
  return context;
}
