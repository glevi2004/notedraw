"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SignIn, useUser } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { getShareLinkData } from "@/collab/data";
import { loadShareSnapshot } from "@/collab/share";

// Dynamically import Excalidraw components to avoid SSR issues
const ExcalidrawWithNotes = dynamic(
  async () => {
    const mod = await import("@/components/note");
    return { default: mod.ExcalidrawWithNotes };
  },
  { ssr: false },
);

export default function SharePage() {
  const params = useParams();
  const shareId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";
  const { isLoaded, isSignedIn } = useUser();
  const { theme } = useTheme();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (typeof window !== "undefined") {
      setRedirectUrl(window.location.href);
    }
    if (!isSignedIn) {
      setStatus("loading");
      return;
    }
    if (!shareId) {
      setError("Missing share id");
      setStatus("error");
      return;
    }

    const linkData = getShareLinkData(window.location.href);
    if (!linkData || linkData.shareId !== shareId) {
      setError("Missing or invalid share key");
      setStatus("error");
      return;
    }

    loadShareSnapshot({
      shareId: linkData.shareId,
      shareKey: linkData.shareKey,
    }).then((result) => {
      if ("errorMessage" in result) {
        setError(result.errorMessage);
        setStatus("error");
        return;
      }
      setData(result.data);
      setStatus("ready");
    });
  }, [isLoaded, isSignedIn, shareId]);

  // Normalize the loaded data to ensure proper format for Excalidraw
  const normalizedData = useMemo(() => {
    if (!data) return null;

    // Handle string data (in case it's still serialized)
    let content = data;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.error("[SharePage] Failed to parse content string:", e);
        return null;
      }
    }

    // Validate and extract elements, appState, and files
    const elements = Array.isArray(content.elements) ? content.elements : [];
    const appState = content.appState || {};
    const files = content.files || {};

    return {
      elements,
      appState,
      files,
      scrollToContent: elements.length > 0,
    };
  }, [data]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
        {redirectUrl ? (
          <SignIn
            routing="hash"
            forceRedirectUrl={redirectUrl}
            fallbackRedirectUrl={redirectUrl}
          />
        ) : (
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background relative overflow-hidden">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      {status === "ready" && normalizedData && (
        <div className="flex-1 relative min-h-0">
          <ExcalidrawWithNotes
            initialData={normalizedData}
            theme={theme === "dark" ? "dark" : "light"}
            viewModeEnabled
            zenModeEnabled
            gridModeEnabled={false}
          />
        </div>
      )}

      {status === "ready" && !normalizedData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-destructive">Failed to load scene data</div>
        </div>
      )}
    </div>
  );
}
