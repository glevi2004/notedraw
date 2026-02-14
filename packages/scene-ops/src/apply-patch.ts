import { createNoteContentFromMarkdown, createNoteContentFromText } from "./note-content";
import { normalizeSceneElements } from "./normalize";
import type { ApplyResult, ApplySummary, SceneElement, ScenePatch, SceneState } from "./types";
import { validateScenePatch } from "./validate";

const cloneSceneState = (scene: SceneState): SceneState => ({
  elements: normalizeSceneElements(scene.elements ?? []),
  appState: { ...(scene.appState ?? {}) },
  files: { ...(scene.files ?? {}) },
  version: scene.version,
});

const cloneElement = (element: SceneElement): SceneElement => ({ ...element });

const removeElementsById = (elements: SceneElement[], id: string): SceneElement[] =>
  elements.filter((element) => element.id !== id);

const ensureSummary = (): ApplySummary => ({
  added: 0,
  updated: 0,
  deleted: 0,
  notesUpdated: 0,
  filesUpserted: 0,
  filesDeleted: 0,
});

const isDifferentObject = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) !== JSON.stringify(right);

export const applyScenePatch = (scene: SceneState, patch: ScenePatch): ApplyResult => {
  const validation = validateScenePatch(patch);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
    };
  }

  const nextScene = cloneSceneState(scene);
  let elements = nextScene.elements.map(cloneElement);
  const appState = { ...(nextScene.appState ?? {}) };
  const files = { ...(nextScene.files ?? {}) };
  const summary = ensureSummary();
  const warnings: string[] = [];

  for (const op of validation.patch.ops) {
    switch (op.op) {
      case "add_element": {
        const normalized = normalizeSceneElements([op.element])[0];
        const existingIndex = elements.findIndex((element) => element.id === normalized.id);

        if (existingIndex >= 0) {
          warnings.push(`add_element replaced existing element \"${normalized.id}\"`);
          elements[existingIndex] = normalized;
          summary.updated += 1;
        } else {
          elements.push(normalized);
          summary.added += 1;
        }
        break;
      }
      case "update_element": {
        const index = elements.findIndex((element) => element.id === op.id);
        if (index < 0) {
          warnings.push(`update_element skipped missing element \"${op.id}\"`);
          break;
        }

        const previous = elements[index];
        const next = {
          ...previous,
          ...op.changes,
          id: previous.id,
        } as SceneElement;

        if (isDifferentObject(previous, next)) {
          elements[index] = next;
          summary.updated += 1;
        }
        break;
      }
      case "delete_element": {
        const before = elements.length;
        elements = removeElementsById(elements, op.id);
        if (before === elements.length) {
          warnings.push(`delete_element skipped missing element \"${op.id}\"`);
        } else {
          summary.deleted += 1;
        }
        break;
      }
      case "replace_elements": {
        elements = normalizeSceneElements(op.elements);
        break;
      }
      case "update_app_state": {
        Object.assign(appState, op.changes);
        break;
      }
      case "upsert_file": {
        files[op.fileId] = op.file;
        summary.filesUpserted += 1;
        break;
      }
      case "delete_file": {
        if (Object.hasOwn(files, op.fileId)) {
          delete files[op.fileId];
          summary.filesDeleted += 1;
        } else {
          warnings.push(`delete_file skipped missing file \"${op.fileId}\"`);
        }
        break;
      }
      case "note_set_content": {
        const index = elements.findIndex((element) => element.id === op.id);
        if (index < 0) {
          warnings.push(`note_set_content skipped missing note \"${op.id}\"`);
          break;
        }

        const current = elements[index];
        if (current.type !== "note") {
          warnings.push(`note_set_content skipped non-note element \"${op.id}\"`);
          break;
        }

        elements[index] = { ...current, noteContent: op.noteContent };
        summary.notesUpdated += 1;
        break;
      }
      case "note_from_text": {
        const index = elements.findIndex((element) => element.id === op.id);
        if (index < 0) {
          warnings.push(`note_from_text skipped missing note \"${op.id}\"`);
          break;
        }

        const current = elements[index];
        if (current.type !== "note") {
          warnings.push(`note_from_text skipped non-note element \"${op.id}\"`);
          break;
        }

        elements[index] = {
          ...current,
          noteContent: createNoteContentFromText(op.text),
        };
        summary.notesUpdated += 1;
        break;
      }
      case "note_from_markdown": {
        const index = elements.findIndex((element) => element.id === op.id);
        if (index < 0) {
          warnings.push(`note_from_markdown skipped missing note \"${op.id}\"`);
          break;
        }

        const current = elements[index];
        if (current.type !== "note") {
          warnings.push(`note_from_markdown skipped non-note element \"${op.id}\"`);
          break;
        }

        elements[index] = {
          ...current,
          noteContent: createNoteContentFromMarkdown(op.markdown),
        };
        summary.notesUpdated += 1;
        break;
      }
      default: {
        const opName = (op as { op: string }).op;
        warnings.push(`unsupported operation \"${opName}\"`);
      }
    }
  }

  nextScene.elements = normalizeSceneElements(elements);
  nextScene.appState = appState;
  nextScene.files = files;
  nextScene.version = typeof scene.version === "number" ? scene.version + 1 : 1;

  return {
    ok: true,
    scene: nextScene,
    summary,
    warnings,
  };
};
