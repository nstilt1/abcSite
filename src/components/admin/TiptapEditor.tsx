"use client";

import { useEffect, useState } from "react";
import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";
import "highlight.js/styles/atom-one-dark.css";
import { mediaURL } from "@/lib/mediaURL";

// Extend Image to persist a `class` attribute so alignment survives
// JSON → tiptapToHtml → <article> on the public page.
const ImageWithAlignment = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (el: Element) => el.getAttribute("class"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.class ? { class: attrs.class } : {},
      },
    };
  },
});

const ALIGNMENTS = [
  { value: "",                        label: "None" },
  { value: "mx-auto block",           label: "Center" },
  { value: "float-left mr-4 mb-2",    label: "Left (wrap)" },
  { value: "float-right ml-4 mb-2",   label: "Right (wrap)" },
] as const;

type TiptapEditorProps = {
  value: JSONContent;
  onChange: (doc: JSONContent) => void;
};

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export default function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const [imagePath,    setImagePath]    = useState("");
  const [imageAlign,   setImageAlign]   = useState("");
  const [imageError,   setImageError]   = useState("");
  const [youtubeUrl,   setYoutubeUrl]   = useState("");
  const [youtubeError, setYoutubeError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      ImageWithAlignment,
      Link.configure({ openOnClick: false, autolink: false, linkOnPaste: true }),
      Youtube.configure({ controls: true, nocookie: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: { class: "min-h-[300px] p-2 outline-none prose max-w-none" },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = JSON.stringify(value ?? EMPTY_DOC);
    const cur  = JSON.stringify(editor.getJSON() ?? EMPTY_DOC);
    if (next !== cur) editor.commands.setContent(value ?? EMPTY_DOC, { emitUpdate: false });
  }, [editor, value]);

  function handleInsertImage() {
    const trimmed = imagePath.trim();
    if (!trimmed) {
      setImageError("Enter a CDN path, e.g. images/my-photo.jpg");
      return;
    }
    const resolved = mediaURL(trimmed);
    if (!resolved) {
      setImageError("Could not resolve URL — check NEXT_PUBLIC_CDN_URL is set.");
      return;
    }
    // Use insertContent directly so we can include the extra `class` attribute
    // without fighting SetImageOptions (which only knows src/alt/title/width/height).
    const attrs: Record<string, string> = { src: resolved };
    if (imageAlign) attrs.class = imageAlign;
    editor?.chain().focus().insertContent({ type: "image", attrs }).run();
    setImagePath("");
    setImageError("");
  }

  function handleInsertYoutube() {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setYoutubeError("Enter a YouTube URL, e.g. https://youtube.com/watch?v=...");
      return;
    }
    const ok = editor?.chain().focus().setYoutubeVideo({ src: trimmed }).run();
    if (!ok) {
      setYoutubeError("Not a valid YouTube URL.");
      return;
    }
    setYoutubeUrl("");
    setYoutubeError("");
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2">

      {/* ── Image toolbar ── */}
      <div className="flex flex-col gap-1 rounded-md border bg-muted/30 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Image
          </span>
          <input
            type="text"
            placeholder="images/example.jpg"
            value={imagePath}
            onChange={(e) => { setImagePath(e.target.value); setImageError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsertImage(); } }}
            className="flex-1 min-w-0 rounded border bg-background px-2 py-0.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={imageAlign}
            onChange={(e) => setImageAlign(e.target.value)}
            className="rounded border bg-background px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
          >
            {ALIGNMENTS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleInsertImage}
            className="shrink-0 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Insert
          </button>
        </div>
        {imageError && <p className="text-xs text-destructive">{imageError}</p>}
      </div>

      {/* ── YouTube toolbar ── */}
      <div className="flex flex-col gap-1 rounded-md border bg-muted/30 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            YouTube
          </span>
          <input
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => { setYoutubeUrl(e.target.value); setYoutubeError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsertYoutube(); } }}
            className="flex-1 min-w-0 rounded border bg-background px-2 py-0.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleInsertYoutube}
            className="shrink-0 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Insert
          </button>
        </div>
        {youtubeError && <p className="text-xs text-destructive">{youtubeError}</p>}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}