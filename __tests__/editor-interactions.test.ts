// @vitest-environment jsdom

import {
  addComposerChild$,
  disableImageResize$,
  MDXEditor,
  realmPlugin,
  useCellValue,
} from "@mdxeditor/editor";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contentStatePayload,
  cookbookCanvas,
} from "../src/editor/ContentStateDragSource";
import { iiifBrowserPlugin } from "../src/mdxeditor";
import { IIIFImage, IIIFSnippet } from "../src/tiptap";

const editors: Editor[] = [];
function create(extensions = [IIIFImage, IIIFSnippet]) {
  const editor = new Editor({
    extensions: [StarterKit, ...extensions],
    content: "<p>Before</p><p>After</p>",
  });
  editors.push(editor);
  return editor;
}
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});
function drop(editor: Editor, text: string) {
  vi.spyOn(editor.view, "posAtCoords").mockReturnValue({ pos: 8, inside: -1 });
  const event = {
    clientX: 0,
    clientY: 0,
    dataTransfer: { getData: () => text },
  } as unknown as DragEvent;
  return editor.view.someProp("handleDrop", (handle) =>
    handle(editor.view, event, null as never, false),
  );
}

describe("IIIF editor interactions", () => {
  it("inserts dropped Canvas content at the drop position and supports undo", () => {
    const editor = create();
    expect(drop(editor, contentStatePayload(true))).toBe(true);
    expect(editor.getJSON().content?.[1]).toMatchObject({
      type: "iiifSnippet",
      attrs: { canvasId: cookbookCanvas },
    });
    editor.commands.undo();
    expect(editor.getText()).toBe("Before\n\nAfter");
    editor.commands.redo();
    expect(
      editor.getJSON().content?.some((node) => node.type === "iiifSnippet"),
    ).toBe(true);
  });
  it("routes an image drop to a mounted picker and ignores read-only drops", () => {
    const editor = create([IIIFImage]);
    expect(drop(editor, contentStatePayload())).toBeUndefined();
    editor.storage.iiifImage.mounted = 1;
    expect(drop(editor, contentStatePayload())).toBe(true);
    expect(editor.storage.iiifImage.dialog?.target?.type).toBe("Manifest");
    editor.setEditable(false);
    editor.storage.iiifImage.dialog = null;
    expect(drop(editor, contentStatePayload())).toBeUndefined();
    expect(
      editor.commands.insertIIIFImage({ src: "https://example.org/image.jpg" }),
    ).toBe(false);
  });
  it("round-trips HTML, including numeric image dimensions, without MDXEditor", () => {
    const editor = create();
    editor.commands.insertIIIFImage({
      src: "https://example.org/image.jpg",
      alt: "test",
      width: 360,
      height: 240,
    });
    editor.commands.insertIIIFSnippet({
      resourceType: "Canvas",
      manifestId: "https://example.org/manifest",
      canvasId: cookbookCanvas,
      width: 700,
      height: 450,
    });
    const html = editor.getHTML();
    const before = editor.getJSON();
    editor.commands.setContent(html);
    expect(editor.getJSON()).toEqual(before);
    expect(
      editor.commands.insertIIIFImage({ src: "javascript:alert(1)" }),
    ).toBe(false);
    expect(
      editor.commands.insertIIIFSnippet({
        resourceType: "Canvas",
        canvasId: cookbookCanvas,
      }),
    ).toBe(false);
  });
});

describe("MDX drop command", () => {
  it("handles cookbook drops and declines ordinary or read-only drops", async () => {
    const { createEditor, DROP_COMMAND } = await import("lexical");
    const { registerIIIFDrop } = await import("../src/editor/mdx-drop");
    const editor = createEditor({
      onError: (error) => {
        throw error;
      },
    });
    const accept = vi.fn((_targets: Array<{ id: string }>) => true);
    const unregister = registerIIIFDrop(editor, accept);
    const event = (text: string) =>
      ({
        dataTransfer: { getData: () => text },
        preventDefault: vi.fn(),
      }) as unknown as DragEvent;
    const valid = event(contentStatePayload(true));
    expect(editor.dispatchCommand(DROP_COMMAND, valid)).toBe(true);
    expect(accept.mock.calls[0][0][0].id).toBe(cookbookCanvas);
    expect(valid.preventDefault).toHaveBeenCalledOnce();
    expect(editor.dispatchCommand(DROP_COMMAND, event("ordinary text"))).toBe(
      false,
    );
    editor.setEditable(false);
    expect(editor.dispatchCommand(DROP_COMMAND, valid)).toBe(false);
    unregister();
  });
});

it("keeps MDX image resizing disabled across read-only mounts and plugin updates", async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  function Probe() {
    return createElement("output", {
      "data-resize-disabled": useCellValue(disableImageResize$),
    });
  }
  const probe = realmPlugin({
    init: (realm) => realm.pub(addComposerChild$, Probe),
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (readOnly: boolean) =>
    act(async () =>
      root.render(
        createElement(MDXEditor, {
          markdown: "A paragraph.",
          readOnly,
          plugins: [iiifBrowserPlugin(), probe()],
        }),
      ),
    );
  try {
    await render(true);
    expect(
      container.querySelector("output")?.getAttribute("data-resize-disabled"),
    ).toBe("true");
    await render(false);
    expect(
      container.querySelector("output")?.getAttribute("data-resize-disabled"),
    ).toBe("false");
    await render(true);
    expect(
      container.querySelector("output")?.getAttribute("data-resize-disabled"),
    ).toBe("true");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it("persists unlocked image layout and opens existing snippet settings", () => {
  const editor = create();
  editor.commands.insertIIIFImage({
    src: "https://example.org/image.jpg",
    width: 500,
    height: 250,
    lockAspectRatio: false,
    objectFit: "cover",
  });
  const html = editor.getHTML();
  expect(html).toContain('data-lock-aspect-ratio="false"');
  expect(html).toContain("object-fit: cover");
  const before = editor.getJSON();
  editor.commands.setContent(html);
  expect(editor.getJSON()).toEqual(before);
  const snippet = {
    resourceType: "Manifest" as const,
    manifestId: "https://example.org/manifest",
    width: 500,
    height: 300,
  };
  expect(editor.commands.openIIIFSnippet({ position: 0, snippet })).toBe(true);
  expect(editor.storage.iiifSnippet.dialog).toEqual({ position: 0, snippet });
  editor.setEditable(false);
  expect(editor.commands.openIIIFSnippet({ position: 0, snippet })).toBe(false);
});
