"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { applyScenePatch } from "@grovebox/scene-ops";
import type { ScenePatch } from "@grovebox/ai-contracts";
import type { SceneElement, SceneState } from "@grovebox/scene-ops";
import type { ScenePatchApplyResult } from "./scene-chat-types";

type ExcalidrawElementLike = SceneElement & {
  version?: number;
  versionNonce?: number;
};

type ApplyScenePatchToEditorResult = ScenePatchApplyResult & {
  elements?: ExcalidrawElementLike[];
  warnings?: string[];
};

const MAX_VERSION_NONCE = 2_147_483_647;

const randomVersionNonce = (): number =>
  Math.floor(Math.random() * MAX_VERSION_NONCE);

const serializeElementForDiff = (element: ExcalidrawElementLike): string => {
  const { version, versionNonce, ...rest } = element;
  return JSON.stringify(rest);
};

const attachExcalidrawVersions = (
  prevElements: readonly ExcalidrawElementLike[],
  nextElements: SceneElement[],
): ExcalidrawElementLike[] => {
  const previousById = new Map(prevElements.map((element) => [element.id, element]));

  return nextElements.map((rawElement) => {
    const nextElement = rawElement as ExcalidrawElementLike;
    const previous = previousById.get(nextElement.id);

    if (!previous) {
      return {
        ...nextElement,
        version: typeof nextElement.version === "number" ? nextElement.version : 1,
        versionNonce:
          typeof nextElement.versionNonce === "number"
            ? nextElement.versionNonce
            : randomVersionNonce(),
      };
    }

    const changed =
      serializeElementForDiff(previous) !== serializeElementForDiff(nextElement);

    if (!changed) {
      return {
        ...nextElement,
        version:
          typeof previous.version === "number"
            ? previous.version
            : typeof nextElement.version === "number"
              ? nextElement.version
              : 1,
        versionNonce:
          typeof previous.versionNonce === "number"
            ? previous.versionNonce
            : randomVersionNonce(),
      };
    }

    return {
      ...nextElement,
      version:
        typeof previous.version === "number"
          ? previous.version + 1
          : typeof nextElement.version === "number"
            ? nextElement.version + 1
            : 2,
      versionNonce: randomVersionNonce(),
    };
  });
};

const buildCurrentSceneState = (api: ExcalidrawImperativeAPI): SceneState => ({
  elements: (
    api.getSceneElements() as unknown as ExcalidrawElementLike[]
  ).map((element) => ({ ...element })),
  appState: { ...(api.getAppState() as Record<string, unknown>) },
  files: { ...(api.getFiles() as Record<string, unknown>) },
});

export const applyScenePatchToEditor = (
  api: ExcalidrawImperativeAPI,
  patch: ScenePatch,
): ApplyScenePatchToEditorResult => {
  const current = buildCurrentSceneState(api);
  const applied = applyScenePatch(current, patch);

  if (!applied.ok) {
    return {
      ok: false,
      error: applied.errors.join("; "),
    };
  }

  const versionedElements = attachExcalidrawVersions(
    current.elements as ExcalidrawElementLike[],
    applied.scene.elements,
  );

  api.updateScene({
    elements: versionedElements as never,
    appState: applied.scene.appState as never,
  });

  if (
    applied.scene.files &&
    typeof (api as unknown as { addFiles?: (files: Record<string, unknown>) => void }).addFiles ===
      "function"
  ) {
    (
      api as unknown as { addFiles: (files: Record<string, unknown>) => void }
    ).addFiles(applied.scene.files as Record<string, unknown>);
  }

  return {
    ok: true,
    elements: versionedElements,
    warnings: applied.warnings,
  };
};
