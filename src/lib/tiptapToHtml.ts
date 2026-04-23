import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";
import "highlight.js/styles/atom-one-dark.css";

type TiptapDoc = Record<string, unknown>;

const EMPTY_DOC: TiptapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function tiptapDocToHtml(doc: unknown): string {
  const safeDoc =
    doc && typeof doc === "object" ? (doc as TiptapDoc) : EMPTY_DOC;

  return generateHTML(safeDoc, [
    StarterKit.configure({
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Image,
    Link,
    Youtube,
  ]);
}