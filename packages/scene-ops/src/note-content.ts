type BlockNoteInlineText = {
  type: "text";
  text: string;
};

type BlockNoteBlock = {
  type: string;
  content?: BlockNoteInlineText[];
  props?: Record<string, unknown>;
};

const EMPTY_NOTE_CONTENT = JSON.stringify([
  {
    type: "paragraph",
    content: [{ type: "text", text: "" }],
  },
]);

const toParagraph = (text: string): BlockNoteBlock => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

export const createNoteContentFromText = (text: string): string => {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = lines.map((line) => toParagraph(line));
  return JSON.stringify(blocks.length > 0 ? blocks : [toParagraph("")]);
};

export const createNoteContentFromMarkdown = (md: string): string => {
  const raw = String(md ?? "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const blocks: BlockNoteBlock[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        props: { level: headingMatch[1].length },
        content: [{ type: "text", text: headingMatch[2] }],
      });
      continue;
    }

    const bulletMatch = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bulletMatch) {
      blocks.push({
        type: "bulletListItem",
        content: [{ type: "text", text: bulletMatch[1] }],
      });
      continue;
    }

    blocks.push(toParagraph(trimmed));
  }

  if (blocks.length === 0) {
    return EMPTY_NOTE_CONTENT;
  }

  return JSON.stringify(blocks);
};

const extractTextNode = (value: unknown): string => {
  if (value == null) return "";

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => extractTextNode(entry))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.text === "string") {
      return record.text;
    }

    if (record.content != null) {
      return extractTextNode(record.content);
    }
  }

  return "";
};

export const extractPlainTextFromNoteContent = (noteContent: string): string => {
  if (!noteContent) return "";

  try {
    const parsed = JSON.parse(noteContent) as unknown;
    return extractTextNode(parsed);
  } catch {
    return noteContent;
  }
};
