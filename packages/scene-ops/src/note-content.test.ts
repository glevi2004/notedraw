import { describe, expect, it } from "vitest";
import {
  createNoteContentFromMarkdown,
  createNoteContentFromText,
  extractPlainTextFromNoteContent,
} from "./note-content";

describe("note-content", () => {
  it("creates blocknote json from plain text", () => {
    const content = createNoteContentFromText("Line one\nLine two");
    expect(() => JSON.parse(content)).not.toThrow();
    expect(extractPlainTextFromNoteContent(content)).toContain("Line one");
    expect(extractPlainTextFromNoteContent(content)).toContain("Line two");
  });

  it("converts markdown headings and bullets", () => {
    const content = createNoteContentFromMarkdown("# Title\n- First\n- Second");
    const parsed = JSON.parse(content) as Array<{ type: string }>;
    expect(parsed[0]?.type).toBe("heading");
    expect(parsed[1]?.type).toBe("bulletListItem");
  });

  it("extracts text from serialized note blocks", () => {
    const raw = JSON.stringify([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello world" }],
      },
    ]);
    expect(extractPlainTextFromNoteContent(raw)).toContain("Hello world");
  });
});
