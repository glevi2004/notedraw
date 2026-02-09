"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

interface NoteEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  theme?: "light" | "dark";
}

export function NoteEditor({
  content,
  onChange,
  editable = true,
  theme = "light",
}: NoteEditorProps) {
  // Parse initial content
  const initialContent = useMemo(() => {
    if (!content) return undefined;
    try {
      return JSON.parse(content) as PartialBlock[];
    } catch {
      // If not valid JSON, create a paragraph with the content
      return [
        {
          type: "paragraph",
          content: [{ type: "text", text: content }],
        },
      ] as PartialBlock[];
    }
  }, [content]);

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent,
  });

  // Track previous editable state to detect when entering edit mode
  const wasEditableRef = useRef(editable);

  // When entering edit mode, focus and place cursor at first block
  useEffect(() => {
    const wasEditable = wasEditableRef.current;
    wasEditableRef.current = editable;

    // Only trigger when transitioning from non-editable to editable
    if (editable && !wasEditable && editor) {
      // Use setTimeout to ensure BlockNote has fully enabled editing
      setTimeout(() => {
        try {
          // Focus the editor
          editor.focus();
          // Place cursor at the start of the first block
          const blocks = editor.document;
          if (blocks.length > 0) {
            editor.setTextCursorPosition(blocks[0].id, "start");
          }
        } catch (e) {
          // Fallback: just focus
          editor.focus();
        }
      }, 0);
    }
  }, [editable, editor]);

  const handleChange = useCallback(() => {
    if (onChange) {
      onChange(JSON.stringify(editor.document));
    }
  }, [editor, onChange]);

  return (
    <div
      className="w-full h-full overflow-auto blocknote-transparent"
      style={{ isolation: "isolate" }}
    >
      <style jsx global>{`
        .blocknote-transparent .bn-container,
        .blocknote-transparent .bn-editor,
        .blocknote-transparent [data-node-type="blockContainer"],
        .blocknote-transparent .ProseMirror {
          background: transparent !important;
        }
        .blocknote-transparent .bn-editor {
          padding: 8px 12px !important;
        }
      `}</style>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={theme === "dark" ? "dark" : "light"}
        onChange={handleChange}
      />
    </div>
  );
}

export default NoteEditor;
