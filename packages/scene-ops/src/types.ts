import type { ScenePatch, ScenePatchOp } from "@grovebox/ai-contracts";

export type { ScenePatch, ScenePatchOp } from "@grovebox/ai-contracts";

export type SceneElement = {
  id: string;
  type: string;
  noteContent?: string;
  [key: string]: unknown;
};

export type SceneState = {
  elements: SceneElement[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
  version?: number;
};

export type NormalizedElements = SceneElement[];

export type ValidationResult =
  | {
      ok: true;
      patch: ScenePatch;
    }
  | {
      ok: false;
      errors: string[];
    };

export type ApplySummary = {
  added: number;
  updated: number;
  deleted: number;
  notesUpdated: number;
  filesUpserted: number;
  filesDeleted: number;
};

export type ApplyResult =
  | {
      ok: true;
      scene: SceneState;
      summary: ApplySummary;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
    };

export type RebasedPatch =
  | {
      ok: true;
      patch: ScenePatch;
      conflicts: string[];
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
    };

export type SceneMutationHandler = (scene: SceneState, op: ScenePatchOp) => SceneState;
