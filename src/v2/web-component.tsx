import { useMemo } from "react";
import {
  IIIFBrowser as IIIFBrowserCopmonent,
  type IIIFBrowserProps,
} from "./IIIFBrowser";

import r2wc from "@r2wc/react-to-web-component";
import type { OutputType } from "./stores/output-store";

interface IIIFBrowserAttributes {
  // Compatibility.
  class?: string;

  // Simplified properties.
  "container-class"?: string;
  "button-class"?: string;
  collection?: string;
  "enable-history"?: boolean;
  "history-key"?: string;
  format?: string; // image-service

  // Action / output
  "action-label"?: string;
  "action-url-template"?: string;
  "output-type"?: string;

  "back-button"?: boolean;
  "forward-button"?: boolean;
  "reload-button"?: boolean;
  "home-button"?: boolean;
  "bookmark-button"?: boolean;
  "menu-button"?: boolean;

  // Navigation.
  "multi-select"?: boolean;
  "can-crop-image"?: boolean;
  "always-show-navigation-arrow"?: boolean;

  "click-to-select"?: boolean;
  "double-click-to-navigate"?: boolean;
  "click-to-navigate"?: boolean;

  "can-navigate-to-collection"?: boolean;
  "can-navigate-to-manifest"?: boolean;
  "can-navigate-to-canvas"?: boolean;

  "can-select-collection"?: boolean;
  "can-select-manifest"?: boolean;
  "can-select-canvas"?: boolean;
  "can-select-image-service"?: boolean;
}

type KebabToCamelCase<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${Capitalize<KebabToCamelCase<U>>}`
  : S;

type IIIFBrowserProperties = {
  [K in keyof IIIFBrowserAttributes as KebabToCamelCase<K>]: IIIFBrowserAttributes[K];
} & {
  onSelect: (result: { result: any; parent?: any }) => void;
};

function defaultBool(
  boolOrUndefined: boolean | undefined,
  defaultValue: boolean,
) {
  if (typeof boolOrUndefined === "undefined") {
    return defaultValue;
  }
  return boolOrUndefined;
}

function IIIFBrowserWrapper(attributes: IIIFBrowserProperties) {
  const props = useMemo(() => {
    // @todo these properties from simplified.
    const history = {} as Exclude<IIIFBrowserProps["history"], undefined>;
    const output = [] as Exclude<IIIFBrowserProps["output"], undefined>;
    const ui = {
      backButton: defaultBool(attributes.backButton, true),
      bookmarkButton: defaultBool(attributes.bookmarkButton, true),
      buttonClassName: attributes.buttonClass,
      reloadButton: defaultBool(attributes.reloadButton, false),
      forwardButton: defaultBool(attributes.forwardButton, false),
      menuButton: defaultBool(attributes.menuButton, true),
    } as Exclude<IIIFBrowserProps["ui"], undefined>;

    const canSelectCanvas = defaultBool(attributes.canSelectCanvas, true);
    const canCropImage = defaultBool(attributes.canCropImage, false);
    const canSelectManifest = defaultBool(attributes.canSelectManifest, true);
    const canSelectCollection = defaultBool(
      attributes.canSelectCollection,
      true,
    );

    const supportedTypes = [
      canSelectCanvas && "Canvas",
      canCropImage && "CanvasRegion",
      canSelectManifest && "Manifest",
      canSelectCollection && "Collection",
    ].filter(Boolean) as OutputType[];

    if (attributes.actionUrlTemplate) {
      // We configure a template.
      output.push({
        type: "open-new-window",
        urlPattern: attributes.actionUrlTemplate,
        label: attributes.actionLabel || "Open",
        supportedTypes,
        format:
          attributes.format === "image-service"
            ? { type: "image-service" }
            : { type: "url", resolvable: true },
      });
    } else {
      // Default to browser event.
      output.push({
        type: "callback",
        label: attributes.actionLabel || "Open",
        supportedTypes,
        cb: attributes.onSelect,
        format:
          attributes.format === "image-service"
            ? { type: "image-service" }
            : {
                type: "custom",
                format: (resource, parent) => ({ resource, parent }),
              },
      });
    }

    if (attributes.collection) {
      history.initialHistory = [
        {
          url: attributes.collection,
          resource: attributes.collection,
          route: `/loading?id=${attributes.collection}`,
        },
      ];
      ui.homeLink = attributes.collection;
    }

    if (attributes.enableHistory) {
      history.restoreFromLocalStorage = true;
      history.saveToLocalStorage = true;
      history.localStorageKey = attributes.historyKey;
    } else {
      history.restoreFromLocalStorage = false;
      history.saveToLocalStorage = false;
    }

    return {
      className: attributes.containerClass,
      ui,
      output,
      history,
      navigation: {
        ...filterUndefined({
          canSelectManifest: attributes.canSelectManifest,
          canSelectCanvas: attributes.canSelectCanvas,
          canSelectImageService: attributes.canSelectImageService,
          canSelectCollection: attributes.canSelectCollection,
          multiSelect: attributes.multiSelect,
          doubleClickToNavigate: attributes.doubleClickToNavigate,
          canCropImage: attributes.canCropImage,
          canNavigateToCanvas: attributes.canNavigateToCanvas,
          canNavigateToManifest: attributes.canNavigateToManifest,
          canNavigateToCollection: attributes.canNavigateToCollection,
        }),
      },
    } as IIIFBrowserProps;
  }, [attributes]);

  return <IIIFBrowserCopmonent {...props} />;
}

function filterUndefined(object: any) {
  return Object.fromEntries(
    Object.entries(object).filter(([_, value]) => value !== undefined),
  );
}

// Add to custom elements in typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "iiif-browser": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & IIIFBrowserAttributes,
        HTMLElement
      >;
    }
  }
  interface HTMLElementTagNameMap {
    "iiif-browser": HTMLElement & IIIFBrowserAttributes;
  }
}

const IIIFBrowser = r2wc(IIIFBrowserWrapper, {
  props: {
    // Simplified properties.
    containerClass: "string",
    collection: "string",
    enableHistory: "boolean",
    historyKey: "string",

    // Action / output
    actionLabel: "string",
    actionUrlTemplate: "string",
    outputType: "string",

    backButton: "boolean",
    forwardButton: "boolean",
    reloadButton: "boolean",
    homeButton: "boolean",
    bookmarkButton: "boolean",
    menuButton: "boolean",

    // Navigation.
    multiSelect: "boolean",
    canCropImage: "boolean",
    alwaysShowNavigationArrow: "boolean",

    clickToSelect: "boolean",
    doubleClickToNavigate: "boolean",
    clickToNavigate: "boolean",

    canNavigateToCollection: "boolean",
    canNavigateToManifest: "boolean",
    canNavigateToCanvas: "boolean",

    canSelectCollection: "boolean",
    canSelectManifest: "boolean",
    canSelectCanvas: "boolean",
    canSelectImageService: "boolean",
  },
  events: { onSelect: { bubbles: true } }, // dispatches as "select", will bubble to ancestor elements but not escape a shadow DOM
});

if (typeof customElements !== "undefined") {
  try {
    customElements.define("iiif-browser", IIIFBrowser);
  } catch (error) {
    console.error("Failed to register IIIFBrowser component:", error);
  }
}
