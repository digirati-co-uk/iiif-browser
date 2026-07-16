import type { Vault } from "@iiif/helpers/vault";
import {
  addComposerChild$,
  ButtonWithTooltip,
  Cell,
  GenericJsxEditor,
  insertMarkdown$,
  type JsxComponentDescriptor,
  type JsxEditorProps,
  jsxPlugin,
  NestedLexicalEditor,
  type RealmPlugin,
  realmPlugin,
  rootEditor$,
  useCellValue,
  useMdastNodeUpdater,
  usePublisher,
} from "@mdxeditor/editor";
import type {
  ComponentProps,
  ComponentType,
  CSSProperties,
  ReactNode,
} from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Modal as AriaModal,
  Dialog,
  Heading,
  ModalOverlay,
} from "react-aria-components";
import { IIIFBrowser, type IIIFBrowserProps } from "../IIIFBrowser";
import { IIIFPluginLogo } from "../icons/IIIFPluginLogos";
import {
  IIIFCanvas,
  IIIFCollection,
  IIIFManifest,
  IIIFSnippetProvider,
} from "./components";

const DEFAULT_SOURCE = "iiif-browser/mdxeditor-snippet";
type ResourceType = "Collection" | "Manifest" | "Canvas";
type PropValue = string | number | boolean;
type FlowJsxNode = Extract<
  JsxEditorProps["mdastNode"],
  { type: "mdxJsxFlowElement" }
>;

export interface IIIFSnippetComponentConfig {
  /** MDX tag name. */
  name?: string;
  /** Import source, or false when the MDX environment supplies the component. */
  source?: string | false;
  /** Extra attributes added to every inserted component. */
  props?: Record<string, PropValue>;
  /** Optional replacement for the editor preview. */
  Editor?: ComponentType<JsxEditorProps>;
}

export interface IIIFSnippetProviderConfig {
  name?: string;
  source?: string | false;
}

export interface IIIFSnippetPluginParams {
  /** Built-in toolbar icon. Defaults to the IIIF add mark. */
  icon?: "stack" | "add";
  /** Every IIIF Browser option except its plugin-owned output action. */
  browserProps?: Omit<IIIFBrowserProps, "output">;
  components?: Partial<Record<ResourceType, IIIFSnippetComponentConfig>>;
  /** Disable to let custom MDX components load their own resources. */
  provider?: false | IIIFSnippetProviderConfig;
  defaultSize?: false | { width?: number; height?: number };
  /** Collection detail navigation. Defaults to a breadcrumb in the caption. */
  collectionNavigation?: "breadcrumbs" | "button";
  dialog?: {
    title?: ReactNode;
    closeLabel?: string;
    className?: string;
    browserClassName?: string;
    style?: CSSProperties;
  };
  actionLabel?: string;
}

export interface IIIFSnippetSelection {
  id: string;
  type: string;
  parent?: { id: string; type: string };
  width?: number;
  height?: number;
}

const config$ = Cell<IIIFSnippetPluginParams>({});
const open$ = Cell(false);

const snippetPlugin = realmPlugin<IIIFSnippetPluginParams>({
  init(realm, params) {
    realm.pub(config$, params ?? {});
    realm.pub(addComposerChild$, IIIFSnippetDialog);
  },
  update(realm, params) {
    realm.pub(config$, params ?? {});
  },
});

/** Adds a separate IIIF Browser dialog that inserts configurable MDX components. */
export function iiifSnippetPlugin(
  params: IIIFSnippetPluginParams = {},
): RealmPlugin {
  const mdx = jsxPlugin({
    jsxComponentDescriptors: createDescriptors(params),
  });
  const snippet = snippetPlugin(params);

  return {
    init(realm) {
      mdx.init?.(realm);
      snippet.init?.(realm);
    },
    postInit(realm) {
      mdx.postInit?.(realm);
      snippet.postInit?.(realm);
    },
    update(realm) {
      mdx.update?.(realm);
      snippet.update?.(realm);
    },
  };
}

export interface InsertIIIFSnippetProps
  extends Omit<ComponentProps<typeof ButtonWithTooltip>, "title"> {
  label?: string;
}

export function InsertIIIFSnippet({
  label = "Insert IIIF snippet",
  children,
  ...props
}: InsertIIIFSnippetProps) {
  const config = useCellValue(config$);
  const setOpen = usePublisher(open$);
  return (
    <ButtonWithTooltip
      {...props}
      title={label}
      aria-label={label}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      }}
    >
      {children ?? <IIIFPluginLogo icon={config.icon ?? "add"} />}
    </ButtonWithTooltip>
  );
}

export function IIIFSnippetDialog() {
  const config = useCellValue(config$);
  const open = useCellValue(open$);
  const rootEditor = useCellValue(rootEditor$);
  const setOpen = usePublisher(open$);
  const insertMarkdown = usePublisher(insertMarkdown$);
  const [error, setError] = useState("");
  const browserProps = config.browserProps ?? {};

  useEffect(() => {
    if (open) setError("");
  }, [open]);

  const close = () => {
    setOpen(false);
    setError("");
  };

  const output = useMemo(
    () => [
      {
        type: "callback" as const,
        label: config.actionLabel ?? "Insert snippet",
        supportedTypes: ["Collection", "Manifest", "Canvas"] as const,
        format: {
          type: "custom" as const,
          format: (
            resource: IIIFSnippetSelection,
            _parent: unknown,
            _vault: Vault,
          ) => resource,
        },
        cb: (selection: IIIFSnippetSelection) => {
          try {
            const markdown = createIIIFSnippetMarkdown(selection, config);
            rootEditor?.focus(() => insertMarkdown(markdown), {
              defaultSelection: "rootEnd",
            });
            setOpen(false);
            setError("");
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Could not insert snippet",
            );
          }
        },
      },
    ],
    [config, insertMarkdown, rootEditor, setOpen],
  );

  return (
    <ModalOverlay
      isOpen={open}
      isDismissable
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
      className="iiif-browser-mdx-overlay"
    >
      <AriaModal
        className={["iiif-browser-mdx-modal", config.dialog?.className]
          .filter(Boolean)
          .join(" ")}
        style={config.dialog?.style}
      >
        <Dialog className="iiif-browser-mdx-dialog">
          <header className="iiif-browser-mdx-header">
            <Heading slot="title" className="iiif-browser-mdx-title">
              {config.dialog?.title ?? "Insert IIIF snippet"}
            </Heading>
            <button
              type="button"
              className="iiif-browser-mdx-close"
              onClick={close}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
              <span className="iiif-browser-mdx-sr-only">
                {config.dialog?.closeLabel ?? "Close"}
              </span>
            </button>
          </header>

          {error ? (
            <div className="iiif-browser-mdx-alert" role="alert">
              {error}
            </div>
          ) : null}

          <div
            className={[
              "iiif-browser-mdx-browser",
              config.dialog?.browserClassName,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <IIIFBrowser
              {...browserProps}
              className={browserProps.className ?? "h-full w-full"}
              navigation={{
                multiSelect: false,
                canCropImage: false,
                ...browserProps.navigation,
              }}
              output={output as any}
            />
          </div>
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}

export function createIIIFSnippetMarkdown(
  selection: IIIFSnippetSelection,
  config: IIIFSnippetPluginParams = {},
): string {
  const type = normalizeType(selection.type);
  const component = componentConfig(type, config);
  const ids = idProps(type, selection);
  const size: Record<string, PropValue> =
    config.defaultSize === false
      ? {}
      : {
          width: selection.width ?? config.defaultSize?.width ?? 640,
          height: selection.height ?? config.defaultSize?.height ?? 420,
        };
  const collectionProps: Record<string, PropValue> =
    type === "Collection" && config.collectionNavigation === "button"
      ? { navigation: "button" }
      : {};
  const attributes = attributesToMdx({
    ...component.props,
    ...collectionProps,
    ...size,
    ...ids,
  });
  const componentMdx = `<${component.name}${attributes} />`;

  if (config.provider === false) return componentMdx;

  const provider = {
    name: config.provider?.name ?? "IIIFSnippetProvider",
    source:
      config.provider?.source === false
        ? undefined
        : (config.provider?.source ?? DEFAULT_SOURCE),
  };
  assertComponentName(provider.name);
  return `<${provider.name}${attributesToMdx(ids)}>\n  ${componentMdx}\n</${provider.name}>`;
}

function createDescriptors(
  config: IIIFSnippetPluginParams,
): JsxComponentDescriptor[] {
  const descriptors: JsxComponentDescriptor[] = (
    ["Collection", "Manifest", "Canvas"] as const
  ).map((type) => {
    const component = componentConfig(type, config);
    const idNames = Object.keys(
      idProps(type, {
        id: "id",
        type,
        parent: { id: "parent", type: "Manifest" },
      }),
    );
    const propNames = new Set([
      ...idNames,
      ...(type === "Collection" ? ["navigation"] : []),
      ...(config.defaultSize === false ? [] : ["width", "height"]),
      ...Object.keys(component.props ?? {}),
    ]);
    return {
      name: component.name,
      kind: "flow" as const,
      source: component.source,
      props: [...propNames].map((name) => ({
        name,
        type:
          name === "width" || name === "height"
            ? ("number" as const)
            : ("string" as const),
        required: idNames.includes(name),
      })),
      hasChildren: false,
      Editor:
        component.Editor ??
        ((props: JsxEditorProps) => (
          <SnippetEditor
            {...props}
            resourceType={type}
            collectionNavigation={config.collectionNavigation}
          />
        )),
    };
  });

  if (config.provider !== false) {
    const provider = config.provider ?? {};
    descriptors.push({
      name: provider.name ?? "IIIFSnippetProvider",
      kind: "flow",
      source:
        provider.source === false
          ? undefined
          : (provider.source ?? DEFAULT_SOURCE),
      props: ["collectionId", "manifestId", "canvasId"].map((name) => ({
        name,
        type: "string",
      })),
      hasChildren: true,
      Editor: SnippetProviderEditor,
    });
  }

  return descriptors;
}

function SnippetProviderEditor(_: JsxEditorProps) {
  return (
    <NestedLexicalEditor<FlowJsxNode>
      block
      contentEditableProps={{ className: "iiif-snippet-provider-editor" }}
      getContent={(node) => node.children}
      getUpdatedMdastNode={(node, children) => ({
        ...node,
        children: children as FlowJsxNode["children"],
      })}
    />
  );
}

function SnippetEditor({
  resourceType,
  collectionNavigation,
  ...props
}: JsxEditorProps & {
  resourceType: ResourceType;
  collectionNavigation?: "breadcrumbs" | "button";
}) {
  const updateMdastNode = useMdastNodeUpdater();
  const values = Object.fromEntries(
    props.mdastNode.attributes.flatMap((attribute) => {
      if (
        attribute.type !== "mdxJsxAttribute" ||
        typeof attribute.name !== "string"
      ) {
        return [];
      }
      const value = attribute.value;
      if (typeof value === "string") return [[attribute.name, value]];
      if (value && typeof value === "object" && "value" in value) {
        return [[attribute.name, String(value.value)]];
      }
      return [];
    }),
  );
  const width = positiveNumber(values.width, 640);
  const height = positiveNumber(values.height, 420);
  const common = {
    width,
    height,
    onSizeChange: (nextWidth: number, nextHeight: number) => {
      if (nextWidth === width && nextHeight === height) return;
      const updatedNames = new Set<string>();
      const attributes = props.mdastNode.attributes.map((attribute) => {
        if (
          attribute.type !== "mdxJsxAttribute" ||
          (attribute.name !== "width" && attribute.name !== "height")
        ) {
          return attribute;
        }
        updatedNames.add(attribute.name);
        return {
          ...attribute,
          value: {
            type: "mdxJsxAttributeValueExpression" as const,
            value: String(attribute.name === "width" ? nextWidth : nextHeight),
          },
        };
      });
      for (const [name, value] of [
        ["width", nextWidth],
        ["height", nextHeight],
      ] as const) {
        if (!updatedNames.has(name)) {
          attributes.push({
            type: "mdxJsxAttribute",
            name,
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: String(value),
            },
          });
        }
      }
      updateMdastNode({
        attributes,
      });
    },
  };

  return (
    <div className="iiif-snippet-editor">
      <div className="iiif-snippet-editor__settings">
        <GenericJsxEditor {...props} />
      </div>
      <div className="iiif-snippet-editor__preview">
        {resourceType === "Collection" ? (
          <IIIFSnippetProvider collectionId={values.collectionId}>
            <IIIFCollection
              collectionId={values.collectionId}
              navigation={
                values.navigation === "button" ||
                (!values.navigation && collectionNavigation === "button")
                  ? "button"
                  : "breadcrumbs"
              }
              {...common}
            />
          </IIIFSnippetProvider>
        ) : resourceType === "Canvas" ? (
          <IIIFSnippetProvider
            manifestId={values.manifestId}
            canvasId={values.canvasId}
          >
            <IIIFCanvas
              manifestId={values.manifestId}
              canvasId={values.canvasId}
              {...common}
            />
          </IIIFSnippetProvider>
        ) : (
          <IIIFSnippetProvider manifestId={values.manifestId}>
            <IIIFManifest manifestId={values.manifestId} {...common} />
          </IIIFSnippetProvider>
        )}
      </div>
    </div>
  );
}

function componentConfig(type: ResourceType, config: IIIFSnippetPluginParams) {
  const configured = config.components?.[type] ?? {};
  const name = configured.name ?? `IIIF${type}`;
  assertComponentName(name);
  return {
    ...configured,
    name,
    source:
      configured.source === false
        ? undefined
        : (configured.source ?? DEFAULT_SOURCE),
  };
}

function idProps(
  type: ResourceType,
  selection: IIIFSnippetSelection,
): Record<string, PropValue> {
  if (type === "Collection") return { collectionId: selection.id };
  if (type === "Manifest") return { manifestId: selection.id };
  const manifestId =
    selection.parent?.type.toLowerCase() === "manifest"
      ? selection.parent.id
      : undefined;
  if (!manifestId) {
    throw new Error("A selected Canvas must include its parent Manifest.");
  }
  return { manifestId, canvasId: selection.id };
}

function normalizeType(type: string): ResourceType {
  const normalized = `${type.slice(0, 1).toUpperCase()}${type.slice(1).toLowerCase()}`;
  if (
    normalized !== "Collection" &&
    normalized !== "Manifest" &&
    normalized !== "Canvas"
  ) {
    throw new Error(`Unsupported IIIF snippet type: ${type}`);
  }
  return normalized;
}

function attributesToMdx(props: Record<string, PropValue>) {
  return Object.entries(props)
    .map(([name, value]) => {
      if (!/^[A-Za-z_$][\w$-]*$/.test(name)) {
        throw new Error(`Invalid MDX property name: ${name}`);
      }
      return typeof value === "string"
        ? ` ${name}="${escapeAttribute(value)}"`
        : ` ${name}={${String(value)}}`;
    })
    .join("");
}

function assertComponentName(name: string) {
  if (!/^[A-Z][A-Za-z0-9_$.]*$/.test(name)) {
    throw new Error(`Invalid MDX component name: ${name}`);
  }
}

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function positiveNumber(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
