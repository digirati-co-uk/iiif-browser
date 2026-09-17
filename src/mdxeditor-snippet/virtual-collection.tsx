import {
  ButtonWithTooltip,
  Cell,
  insertJsx$,
  type JsxEditorProps,
  jsxPlugin,
  type RealmPlugin,
  readOnly$,
  realmPlugin,
  useCellValue,
  useMdastNodeUpdater,
  usePublisher,
} from "@mdxeditor/editor";
import type { ComponentProps } from "react";
import {
  IIIFVirtualCollection,
  type IIIFVirtualCollectionAttributes,
  type IIIFVirtualCollectionOptions,
} from "../editor/virtual-collection";
import { IIIFPluginLogo } from "../icons/IIIFPluginLogos";

const config$ = Cell<IIIFVirtualCollectionOptions>({});
const configurationPlugin = realmPlugin<IIIFVirtualCollectionOptions>({
  init: (realm, params) => realm.pub(config$, params ?? {}),
  update: (realm, params) => realm.pub(config$, params ?? {}),
});

export function iiifVirtualCollectionPlugin(
  options: IIIFVirtualCollectionOptions = {},
): RealmPlugin {
  const jsx = jsxPlugin({
    jsxComponentDescriptors: [
      {
        name: "IIIFVirtualCollection",
        kind: "flow",
        source: "iiif-browser/mdxeditor-snippet",
        hasChildren: false,
        props: ["title", "items", "width", "height"].map((name) => ({
          name,
          type: name === "width" || name === "height" ? "number" : "string",
        })),
        Editor: VirtualCollectionEditor,
      },
    ],
  });
  const config = configurationPlugin(options);
  return {
    init(realm) {
      jsx.init?.(realm);
      config.init?.(realm);
    },
    postInit(realm) {
      jsx.postInit?.(realm);
      config.postInit?.(realm);
    },
    update(realm) {
      jsx.update?.(realm);
      config.update?.(realm);
    },
  };
}

export function InsertIIIFVirtualCollection({
  children,
  ...props
}: Omit<ComponentProps<typeof ButtonWithTooltip>, "title">) {
  const insert = usePublisher(insertJsx$);
  const readOnly = useCellValue(readOnly$);
  const config = useCellValue(config$);
  return (
    <ButtonWithTooltip
      {...props}
      title="Insert virtual IIIF collection"
      aria-label="Insert virtual IIIF collection"
      disabled={readOnly || props.disabled}
      onClick={(event) => {
        props.onClick?.(event);
        if (!readOnly && !event.defaultPrevented)
          insert({
            kind: "flow",
            name: "IIIFVirtualCollection",
            props: {
              title: "Untitled collection",
              items: "[]",
              width: {
                type: "expression",
                value: String(config.defaultSize?.width ?? 640),
              },
              height: {
                type: "expression",
                value: String(config.defaultSize?.height ?? 420),
              },
            },
          });
      }}
    >
      {children ?? <IIIFPluginLogo icon="add" />}
    </ButtonWithTooltip>
  );
}

function VirtualCollectionEditor({ mdastNode }: JsxEditorProps) {
  const readOnly = useCellValue(readOnly$);
  const config = useCellValue(config$);
  const update = useMdastNodeUpdater();
  const values = Object.fromEntries(
    mdastNode.attributes.flatMap((attribute) => {
      if (attribute.type !== "mdxJsxAttribute") return [];
      const value = attribute.value;
      return typeof value === "string"
        ? [[attribute.name, value]]
        : value && typeof value === "object"
          ? [[attribute.name, value.value]]
          : [];
    }),
  );
  const onChange = (changes: Partial<IIIFVirtualCollectionAttributes>) => {
    if (readOnly) return;
    update({
      attributes: [
        ...mdastNode.attributes.filter(
          (attribute) =>
            attribute.type !== "mdxJsxAttribute" ||
            !(attribute.name in changes),
        ),
        ...Object.entries(changes).map(([name, value]) => ({
          type: "mdxJsxAttribute" as const,
          name,
          value:
            typeof value === "number"
              ? {
                  type: "mdxJsxAttributeValueExpression" as const,
                  value: String(value),
                }
              : value,
        })),
      ],
    });
  };
  return (
    <IIIFVirtualCollection
      title={values.title}
      items={values.items}
      width={Number(values.width) > 0 ? Number(values.width) : 640}
      height={Number(values.height) > 0 ? Number(values.height) : 420}
      browserProps={config.browserProps}
      onChange={readOnly ? undefined : onChange}
    />
  );
}
