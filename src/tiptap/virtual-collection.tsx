import { type Editor, mergeAttributes, Node } from "@tiptap/core";
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
} from "@tiptap/react";
import type { ComponentProps } from "react";
import {
  IIIFVirtualCollection as CollectionView,
  type IIIFVirtualCollectionAttributes,
  type IIIFVirtualCollectionOptions,
  parseVirtualCollectionItems,
} from "../editor/virtual-collection";
import { IIIFPluginLogo } from "../icons/IIIFPluginLogos";

export type {
  IIIFVirtualCollectionAttributes,
  IIIFVirtualCollectionOptions,
} from "../editor/virtual-collection";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    iiifVirtualCollection: {
      insertIIIFVirtualCollection: (
        attributes?: Partial<IIIFVirtualCollectionAttributes>,
      ) => ReturnType;
    };
  }
}

export const IIIFVirtualCollection = Node.create<IIIFVirtualCollectionOptions>({
  name: "iiifVirtualCollection",
  group: "block",
  atom: true,
  draggable: true,
  addOptions: () => ({}),
  addAttributes() {
    const defaults = {
      title: "Untitled collection",
      items: "[]",
      width: this.options.defaultSize?.width ?? 640,
      height: this.options.defaultSize?.height ?? 420,
    };
    return Object.fromEntries(
      Object.entries(defaults).map(([name, value]) => [
        name,
        {
          default: value,
          parseHTML: (element: HTMLElement) => {
            const attribute = element.getAttribute(`data-${name}`);
            return typeof value === "number"
              ? Number(attribute) > 0
                ? Number(attribute)
                : value
              : (attribute ?? value);
          },
          renderHTML: (attributes: Record<string, unknown>) => ({
            [`data-${name}`]: attributes[name],
          }),
        },
      ]),
    );
  },
  parseHTML() {
    return [
      {
        tag: "div[data-iiif-virtual-collection]",
        getAttrs: (element) => {
          try {
            parseVirtualCollectionItems(
              element.getAttribute("data-items") ?? "[]",
            );
            return null;
          } catch {
            return false;
          }
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-iiif-virtual-collection": "true",
      }),
      node.attrs.title,
    ];
  },
  addCommands() {
    return {
      insertIIIFVirtualCollection:
        (attrs = {}) =>
        ({ commands }) => {
          if (!this.editor.isEditable) return false;
          try {
            parseVirtualCollectionItems(attrs.items ?? "[]");
          } catch {
            return false;
          }
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(VirtualCollectionView);
  },
});

function VirtualCollectionView({
  node,
  editor,
  extension,
  updateAttributes,
}: NodeViewProps) {
  const editable = useEditorState({
    editor,
    selector: ({ editor }) => editor.isEditable,
  });
  return (
    <NodeViewWrapper contentEditable={false}>
      <CollectionView
        {...node.attrs}
        browserProps={extension.options.browserProps}
        onChange={
          editable
            ? (attrs) => {
                if (editor.isEditable) updateAttributes(attrs);
              }
            : undefined
        }
      />
    </NodeViewWrapper>
  );
}

export function InsertIIIFVirtualCollection({
  editor,
  children,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & { editor: Editor | null }) {
  const editable = useEditorState({
    editor,
    selector: ({ editor }) => editor?.isEditable ?? false,
  });
  return (
    <button
      type="button"
      aria-label="Insert virtual IIIF collection"
      {...props}
      disabled={!editable || props.disabled}
      onClick={() =>
        editor?.chain().focus().insertIIIFVirtualCollection().run()
      }
    >
      {children ?? <IIIFPluginLogo icon="add" />}
    </button>
  );
}
