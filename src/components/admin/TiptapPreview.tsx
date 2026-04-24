"use client";

import { useEffect } from "react";
import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";
import "highlight.js/styles/atom-one-dark.css";

type TiptapPreviewProps = {
  value: JSONContent;
};

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export default function TiptapPreview({
  value,
}: TiptapPreviewProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image,
      Link.configure({
        autolink: false,
        linkOnPaste: true,
        openOnClick: true,
      }),
      Youtube,
    ],
    content: value,
    editable: false,
    editorProps: {
      attributes: {
        class: "prose max-w-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const next = JSON.stringify(value ?? EMPTY_DOC);
    const cur = JSON.stringify(editor.getJSON() ?? EMPTY_DOC);

    if (next !== cur) {
        editor.commands.setContent(value ?? EMPTY_DOC, { emitUpdate: false });    }
  }, [editor, value]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}