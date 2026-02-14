import { createNoteContentFromText } from "./note-content";
import type { NormalizedElements, SceneElement } from "./types";

const cloneElement = (value: unknown): SceneElement | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const type = typeof record.type === "string" ? record.type.trim() : "";

  const element: SceneElement = {
    ...record,
    id,
    type: type || "rectangle",
  };

  if (element.type === "note") {
    element.noteContent =
      typeof record.noteContent === "string"
        ? record.noteContent
        : createNoteContentFromText("");
  }

  return element;
};

const ensureUniqueId = (id: string, seenIds: Map<string, number>, fallbackIndex: number): string => {
  const baseId = id || `el_${fallbackIndex}`;
  const usageCount = seenIds.get(baseId) ?? 0;

  seenIds.set(baseId, usageCount + 1);

  if (usageCount === 0) {
    return baseId;
  }

  return `${baseId}_${usageCount}`;
};

export const normalizeSceneElements = (elements: unknown[]): NormalizedElements => {
  const seenIds = new Map<string, number>();
  const normalized: SceneElement[] = [];

  for (let index = 0; index < elements.length; index += 1) {
    const cloned = cloneElement(elements[index]);
    if (!cloned) {
      continue;
    }

    cloned.id = ensureUniqueId(cloned.id, seenIds, index);

    if (cloned.type === "note" && typeof cloned.noteContent !== "string") {
      cloned.noteContent = createNoteContentFromText("");
    }

    normalized.push(cloned);
  }

  return normalized;
};
