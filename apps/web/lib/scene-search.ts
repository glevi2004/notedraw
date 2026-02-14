import { extractPlainTextFromNoteContent } from "@grovebox/scene-ops";

type SceneSearchInput = {
  title?: string | null;
  content?: unknown;
};

const MAX_SEARCH_TEXT_LENGTH = 20000;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const safeParseContent = (content: unknown): any | null => {
  if (!content) return null;
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  if (typeof content === "object") {
    return content;
  }
  return null;
};

export const buildSceneSearchText = ({ title, content }: SceneSearchInput) => {
  const parts: string[] = [];

  if (title) {
    parts.push(title);
  }

  const parsed = safeParseContent(content);
  const elements = Array.isArray(parsed?.elements) ? parsed.elements : [];

  for (const element of elements) {
    if (!element || typeof element !== "object") continue;
    if (element.type === "text" && typeof element.text === "string") {
      parts.push(element.text);
    }
    if (typeof element.originalText === "string") {
      parts.push(element.originalText);
    }
    if (element.type === "note" && typeof element.noteContent === "string") {
      parts.push(extractPlainTextFromNoteContent(element.noteContent));
    }
    if (typeof element.noteContent === "string") {
      parts.push(extractPlainTextFromNoteContent(element.noteContent));
    }
  }

  const normalized = normalizeText(parts.join(" "));
  if (!normalized) return null;
  return normalized.length > MAX_SEARCH_TEXT_LENGTH
    ? normalized.slice(0, MAX_SEARCH_TEXT_LENGTH)
    : normalized;
};
