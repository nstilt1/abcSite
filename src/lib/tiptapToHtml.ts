import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Youtube from "@tiptap/extension-youtube"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { lowlight } from "lowlight"

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] }

// Must match the ImageWithAlignment extension in TiptapEditor so the `class`
// attribute stored in the JSON doc is preserved when generating HTML for the
// static page (downloads/[slug]/page.tsx).
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
    }
  },
})

export function tiptapDocToHtml(doc: object | null | undefined): string {
  const safeDoc = doc && typeof doc === "object" ? doc : EMPTY_DOC
  return generateHTML(safeDoc as Parameters<typeof generateHTML>[0], [
    StarterKit.configure({ codeBlock: false }),
    CodeBlockLowlight.configure({ lowlight }),
    ImageWithAlignment,
    Link,
    Youtube,
  ])
}