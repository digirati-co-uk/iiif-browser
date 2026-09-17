import { expect, fireEvent, userEvent, waitFor, within } from "@storybook/test";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import {
  ContentStateDragSource,
  contentStatePayload,
  cookbookManifest,
} from "../editor/ContentStateDragSource";
import {
  IIIFImage,
  IIIFSnippet,
  InsertIIIFImage,
  InsertIIIFSnippet,
} from "./index";

export default { title: "Integrations/TipTap" };
const browserProps = {
  history: {
    initialHistory: [
      {
        url: cookbookManifest,
        resource: cookbookManifest,
        route: `/loading?id=${cookbookManifest}`,
      },
    ],
    restoreFromLocalStorage: false,
    saveToLocalStorage: false,
  },
};
function Demo({
  snippet = false,
  initialReadOnly = false,
  both = false,
  initialImage = false,
}) {
  const [readOnly, setReadOnly] = useState(initialReadOnly);
  const [json, setJson] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      ...(snippet || both ? [IIIFSnippet.configure({ browserProps })] : []),
      ...(!snippet || both
        ? [IIIFImage.configure({ browserProps, image: { defaultWidth: 640 } })]
        : []),
    ],
    editable: !initialReadOnly,
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Drop IIIF content here or use the insertion buttons.",
            },
          ],
        },
        ...(initialImage
          ? [
              {
                type: "iiifImage",
                attrs: {
                  src: "https://dg-view.nls.uk/iiif/2/7440%2F74408454.5/250,300,1200,900/600,/0/default.jpg",
                  alt: "Cropped archive image",
                  width: 480,
                  height: 360,
                },
              },
            ]
          : []),
        ...(snippet
          ? [
              {
                type: "iiifSnippet",
                attrs: {
                  resourceType: "Manifest",
                  manifestId: cookbookManifest,
                },
              },
            ]
          : []),
      ],
    },
    onCreate: ({ editor }) =>
      setJson(JSON.stringify(editor.getJSON(), null, 2)),
    onUpdate: ({ editor }) =>
      setJson(JSON.stringify(editor.getJSON(), null, 2)),
  });
  return (
    <div style={{ maxWidth: 960, margin: "auto", fontFamily: "system-ui" }}>
      <ContentStateDragSource />
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(event) => {
              setReadOnly(event.target.checked);
              editor?.setEditable(!event.target.checked);
            }}
          />{" "}
          Read only
        </label>
        {(!snippet || both) && <InsertIIIFImage editor={editor} />}
        {(snippet || both) && <InsertIIIFSnippet editor={editor} />}
        <button
          type="button"
          disabled={readOnly}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          Redo
        </button>
      </div>
      <div style={{ border: "1px solid #cbd5e1", padding: 20, minHeight: 200 }}>
        <EditorContent editor={editor} />
      </div>
      <pre data-testid="json-output" style={{ whiteSpace: "pre-wrap" }}>
        {json}
      </pre>
    </div>
  );
}
export const ImageApiImage = { render: () => <Demo /> };
export const SnippetEditor = { render: () => <Demo snippet /> };
export const ReadOnly = { render: () => <Demo snippet initialReadOnly /> };
export const BothExtensions = { render: () => <Demo both /> };
export const DropCanvas = {
  render: () => <Demo snippet />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByTestId("json-output")).not.toBeEmptyDOMElement(),
    );
    const editor = canvasElement.querySelector(".tiptap")!;
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", contentStatePayload(true));
    const paragraph = editor.querySelector("p")!;
    await userEvent.click(paragraph);
    const bounds = paragraph.getBoundingClientRect();
    fireEvent(
      editor,
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: bounds.left + 20,
        clientY: bounds.top + bounds.height / 2,
      }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("json-output")).toHaveTextContent(
        '"resourceType": "Canvas"',
      ),
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: "Read only" }));
    await waitFor(() =>
      expect(
        canvasElement.querySelector(".iiif-snippet[data-resizable]"),
      ).toBeNull(),
    );
    const before = canvas.getByTestId("json-output").textContent;
    fireEvent.drop(editor, { dataTransfer });
    expect(canvas.getByTestId("json-output").textContent).toBe(before);
  },
};

export const ImagePicker = {
  render: () => <Demo />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByTestId("json-output")).not.toBeEmptyDOMElement(),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Insert IIIF image" }),
    );
    const doc = canvasElement.ownerDocument;
    const dialog = await within(doc.body).findByRole("dialog", {
      name: "Insert IIIF image",
    });
    const overlay = doc.querySelector(".iiif-browser-mdx-overlay")!;
    expect(getComputedStyle(overlay).position).toBe("fixed");
    expect(getComputedStyle(overlay).boxSizing).toBe("border-box");
    const bounds = dialog.getBoundingClientRect();
    expect(bounds.width).toBeGreaterThan(300);
    expect(bounds.right).toBeLessThanOrEqual(doc.defaultView!.innerWidth);
    expect(bounds.bottom).toBeLessThanOrEqual(doc.defaultView!.innerHeight);
  },
};

export const ImageLayout = {
  render: () => <Demo initialImage />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const edit = await canvas.findByRole("button", { name: "Edit IIIF image" });
    const image = canvasElement.querySelector(
      ".tiptap img",
    ) as HTMLImageElement;
    expect(image.style.height).toBe("auto");
    expect(image.parentElement!.style.resize).toBe("horizontal");
    await userEvent.click(edit);
    const dialog = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog",
      { name: "Image options" },
    );
    const controls = within(dialog);
    const lock = controls.getByRole("checkbox", {
      name: "Keep image aspect ratio",
    });
    expect(lock.getBoundingClientRect().width).toBeLessThanOrEqual(20);
    await userEvent.click(lock);
    await userEvent.selectOptions(
      controls.getByRole("combobox", { name: "Image fit" }),
      "cover",
    );
    await userEvent.click(
      controls.getByRole("button", { name: "Save changes" }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("json-output")).toHaveTextContent(
        '"objectFit": "cover"',
      ),
    );
    expect(image.parentElement!.style.resize).toBe("both");
    expect(image.style.objectFit).toBe("cover");
    // Native resize changes inline dimensions and can release outside the image.
    image.parentElement!.style.width = "360px";
    image.parentElement!.style.height = "240px";
    fireEvent.mouseUp(canvasElement.ownerDocument.defaultView!);
    await waitFor(() =>
      expect(canvas.getByTestId("json-output")).toHaveTextContent(
        '"width": 360',
      ),
    );
    expect(canvas.getByTestId("json-output")).toHaveTextContent(
      '"height": 240',
    );
  },
};
