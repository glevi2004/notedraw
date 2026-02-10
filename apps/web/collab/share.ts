import { compressData, decompressData } from "@excalidraw/excalidraw/data/encode";
import { generateEncryptionKey } from "@excalidraw/excalidraw/data/encryption";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";

import type {
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

export const createShareSnapshot = async (params: {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  sceneId?: string;
}): Promise<{ url: string } | { errorMessage: string }> => {
  const encryptionKey = await generateEncryptionKey("string");
  if (!encryptionKey) {
    return { errorMessage: "Failed to generate encryption key" };
  }

  const payload = await compressData(
    new TextEncoder().encode(
      // Use "local" so files are included for share links (images, etc).
      serializeAsJSON(params.elements, params.appState, params.files, "local"),
    ),
    { encryptionKey },
  );

  const response = await fetch(`/api/share?sceneId=${params.sceneId ?? ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: payload,
  });

  const json = await response.json();
  if (!response.ok || !json.id) {
    return { errorMessage: json?.error || "Could not create share link" };
  }

  const url = new URL(window.location.origin);
  url.pathname = `/share/${json.id}`;
  url.hash = `json=${json.id},${encryptionKey}`;
  return { url: url.toString() };
};

export const loadShareSnapshot = async (params: {
  shareId: string;
  shareKey: string;
}): Promise<{ data: any } | { errorMessage: string }> => {
  const metaRes = await fetch(`/api/share/${params.shareId}`);
  const meta = await metaRes.json();
  if (!metaRes.ok || !meta.url) {
    return { errorMessage: meta?.error || "Share not found" };
  }

  const res = await fetch(meta.url);
  if (!res.ok) {
    return { errorMessage: "Failed to fetch share data" };
  }

  const buffer = new Uint8Array(await res.arrayBuffer());
  try {
    const decoded = await decompressData(buffer, {
      decryptionKey: params.shareKey,
    });
    const json = JSON.parse(new TextDecoder().decode(decoded.data));
    if (!json || typeof json !== "object") {
      return { errorMessage: "Invalid share data" };
    }
    return { data: json };
  } catch (error) {
    return { errorMessage: "Failed to decrypt share data" };
  }
};
