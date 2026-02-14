import type { ScenePatch, SceneState, RebasedPatch } from "./types";
import { applyScenePatch } from "./apply-patch";
import { normalizeSceneElements } from "./normalize";

const stableObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => stableObject(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
  const stable: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    stable[key] = stableObject((value as Record<string, unknown>)[key]);
  }
  return stable;
};

const stableStringify = (value: unknown): string => JSON.stringify(stableObject(value));

const scenesEquivalent = (left: SceneState, right: SceneState): boolean =>
  stableStringify(normalizeSceneElements(left.elements ?? [])) ===
    stableStringify(normalizeSceneElements(right.elements ?? [])) &&
  stableStringify(left.appState ?? {}) === stableStringify(right.appState ?? {}) &&
  stableStringify(left.files ?? {}) === stableStringify(right.files ?? {});

const buildFileDiffOps = (
  headFiles: Record<string, unknown>,
  targetFiles: Record<string, unknown>,
): ScenePatch["ops"] => {
  const ops: ScenePatch["ops"] = [];

  for (const [fileId, file] of Object.entries(targetFiles)) {
    if (!Object.hasOwn(headFiles, fileId) || stableStringify(headFiles[fileId]) !== stableStringify(file)) {
      ops.push({
        op: "upsert_file",
        fileId,
        file,
      });
    }
  }

  for (const fileId of Object.keys(headFiles)) {
    if (!Object.hasOwn(targetFiles, fileId)) {
      ops.push({
        op: "delete_file",
        fileId,
      });
    }
  }

  return ops;
};

export const rebasePatchOnScene = (
  baseScene: SceneState,
  headScene: SceneState,
  patch: ScenePatch,
): RebasedPatch => {
  if (scenesEquivalent(baseScene, headScene)) {
    return {
      ok: true,
      patch,
      conflicts: [],
      warnings: [],
    };
  }

  const applied = applyScenePatch(baseScene, patch);
  if (!applied.ok) {
    return {
      ok: false,
      errors: applied.errors,
    };
  }

  const target = applied.scene;
  const headFiles = { ...(headScene.files ?? {}) };
  const targetFiles = { ...(target.files ?? {}) };

  const rebasedPatch: ScenePatch = {
    baseVersion: typeof headScene.version === "number" ? headScene.version : undefined,
    reason: patch.reason,
    metadata: patch.metadata,
    ops: [
      {
        op: "replace_elements",
        elements: normalizeSceneElements(target.elements),
      },
      {
        op: "update_app_state",
        changes: { ...(target.appState ?? {}) },
      },
      ...buildFileDiffOps(headFiles, targetFiles),
    ],
  };

  return {
    ok: true,
    patch: rebasedPatch,
    conflicts: [],
    warnings: [
      "Patch rebased by materializing the target scene state on top of head scene.",
    ],
  };
};
