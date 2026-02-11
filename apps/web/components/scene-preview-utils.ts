import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { getCommonBounds, getNonDeletedElements, newTextElement, wrapText } from "@excalidraw/element";
import { FONT_FAMILY, VERTICAL_ALIGN, getFontString, getLineHeight } from "@excalidraw/common";

const fileDataUrlCache = new Map<string, string>();
const noteHtmlCache = new Map<string, string>();
let blockNoteEditor: BlockNoteEditor | null = null;

export type PreviewNoteOverlay = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius: number;
  noteContent: string;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const extractNoteText = (noteContent?: string): string => {
  if (!noteContent) return "";
  try {
    const parsed = JSON.parse(noteContent);
    const extract = (node: any): string => {
      if (!node) return "";
      if (typeof node === "string") return node;
      if (Array.isArray(node)) {
        return node
          .map(extract)
          .filter(Boolean)
          .join("\n");
      }
      if (typeof node === "object") {
        if (typeof node.text === "string") {
          return node.text;
        }
        if (Array.isArray(node.content)) {
          return extract(node.content);
        }
      }
      return "";
    };
    return extract(parsed);
  } catch {
    return noteContent;
  }
};

const parseNoteBlocks = (noteContent?: string): PartialBlock[] => {
  if (!noteContent) {
    return [
      {
        type: "paragraph",
        content: [{ type: "text", text: "" }],
      },
    ];
  }
  try {
    const parsed = JSON.parse(noteContent);
    if (Array.isArray(parsed)) {
      return parsed as PartialBlock[];
    }
  } catch {
    // fall through to text fallback
  }
  return [
    {
      type: "paragraph",
      content: [{ type: "text", text: noteContent }],
    },
  ];
};

const getBlockNoteEditor = () => {
  if (!blockNoteEditor) {
    blockNoteEditor = BlockNoteEditor.create();
  }
  return blockNoteEditor;
};

export const serializeNoteContentToHtml = (noteContent?: string): string => {
  const cacheKey = noteContent ?? "";
  const cached = noteHtmlCache.get(cacheKey);
  if (cached) return cached;

  if (typeof window === "undefined") {
    return "";
  }

  const blocks = parseNoteBlocks(noteContent);
  const editor = getBlockNoteEditor();
  const html = editor.blocksToFullHTML(blocks);
  noteHtmlCache.set(cacheKey, html);
  return html;
};

const truncateWrappedText = (text: string, maxLines: number) => {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  const clipped = lines.slice(0, maxLines);
  const lastIdx = clipped.length - 1;
  const last = clipped[lastIdx].trimEnd();
  clipped[lastIdx] =
    last.length > 3 ? `${last.slice(0, Math.max(1, last.length - 3))}...` : `${last}...`;
  return clipped.join("\n");
};

export const buildPreviewElements = (
  elements: any[],
  theme: "light" | "dark",
  options?: {
    noteRenderMode?: "text" | "none";
    collectNotes?: boolean;
  },
) => {
  const previewElements: any[] = [];
  const notes: PreviewNoteOverlay[] = [];
  if (!Array.isArray(elements)) return { elements: previewElements, notes };

  for (const element of elements) {
    if (!element || element.isDeleted) continue;
    if (element.type !== "note") {
      previewElements.push(element);
      continue;
    }

    const note = element as any;
    const fallbackBackground =
      note.backgroundColor === "transparent"
        ? theme === "dark"
          ? "#2d2d2d"
          : "#fffce8"
        : note.backgroundColor || "#fffce8";
    const strokeColor = note.strokeColor || "#1e1e1e";
    const strokeWidth = note.strokeWidth ?? 2;
    const rect = {
      ...note,
      type: "rectangle",
      backgroundColor: fallbackBackground,
      strokeColor,
      strokeWidth,
      opacity: note.opacity ?? 100,
    };
    delete rect.noteContent;
    previewElements.push(rect);

    if (options?.collectNotes) {
      const borderRadius = note.roundness
        ? Math.min(note.width, note.height) * 0.1
        : 0;
      notes.push({
        id: note.id,
        x: note.x,
        y: note.y,
        width: note.width,
        height: note.height,
        angle: note.angle ?? 0,
        backgroundColor: fallbackBackground,
        strokeColor,
        strokeWidth,
        borderRadius,
        noteContent: note.noteContent || "",
      });
    }

    if (options?.noteRenderMode !== "none") {
      const noteText = extractNoteText(note.noteContent).trim();
      if (!noteText) continue;

      const fontFamily = FONT_FAMILY.Helvetica;
      const fontSize = Math.max(
        12,
        Math.min(16, Math.round((note.height || 0) / 6)),
      );
      const fontString = getFontString({ fontFamily, fontSize });
      const padding = 10;
      const maxWidth = Math.max(40, (note.width || 0) - padding * 2);
      const wrapped = wrapText(noteText, fontString, maxWidth);
      const lineHeight = getLineHeight(fontFamily);
      const maxLines = Math.max(
        1,
        Math.floor(
          ((note.height || 0) - padding * 2) / (fontSize * lineHeight),
        ),
      );
      const text = truncateWrappedText(wrapped, maxLines);

      const textColor =
        note.strokeColor && note.strokeColor !== "transparent"
          ? note.strokeColor
          : theme === "dark"
            ? "#f8fafc"
            : "#111827";

      const textElement = newTextElement({
        x: (note.x || 0) + padding,
        y: (note.y || 0) + padding,
        text,
        fontFamily,
        fontSize,
        textAlign: "left",
        verticalAlign: VERTICAL_ALIGN.TOP,
        angle: note.angle ?? 0,
        strokeColor: textColor,
        backgroundColor: "transparent",
      });
      previewElements.push(textElement);
    }
  }

  return { elements: previewElements, notes };
};

export const computePreviewPadding = (
  elements: any[],
  targetScale = 0.55,
  minPadding = 24,
) => {
  const nonDeleted = getNonDeletedElements(elements as any);
  if (!nonDeleted.length) return minPadding;
  const [minX, minY, maxX, maxY] = getCommonBounds(nonDeleted as any);
  const width = maxX - minX;
  const height = maxY - minY;
  const maxDim = Math.max(width, height);
  if (!Number.isFinite(maxDim) || maxDim <= 0) return minPadding;
  const padding = (maxDim * (1 - targetScale)) / (2 * targetScale);
  return Math.max(minPadding, Math.round(padding));
};

export const normalizeFilesForPreview = async (
  files: Record<string, any> | undefined,
  elements: any[],
) => {
  if (!files || typeof files !== "object") return {};

  const hasImages = Array.isArray(elements)
    ? elements.some((element) => element?.type === "image")
    : false;

  if (!hasImages) {
    return files;
  }

  const entries = await Promise.all(
    Object.entries(files).map(async ([fileId, file]) => {
      if (!file || typeof file !== "object") return [fileId, file];
      const dataURL = (file as any).dataURL;
      if (typeof dataURL !== "string") return [fileId, file];
      if (dataURL.startsWith("data:")) return [fileId, file];

      const cached = fileDataUrlCache.get(dataURL);
      if (cached) return [fileId, { ...file, dataURL: cached }];

      try {
        const response = await fetch(dataURL);
        if (!response.ok) return [fileId, file];
        const blob = await response.blob();
        const normalized = await blobToDataUrl(blob);
        fileDataUrlCache.set(dataURL, normalized);
        return [fileId, { ...file, dataURL: normalized }];
      } catch {
        return [fileId, file];
      }
    }),
  );

  return Object.fromEntries(entries);
};
