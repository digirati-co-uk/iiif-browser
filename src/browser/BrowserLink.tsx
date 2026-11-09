import type { Vault } from "@iiif/helpers";
import { useCallback, useMemo, useRef } from "react";
import { useHover, usePress } from "react-aria";
import { useVault } from "react-iiif-vault";
import { useStore } from "zustand";
import { Checkbox } from "../components/Checkbox";
import {
  useCanResolve,
  useCanSelect,
  useLinkConfig,
  useResolve,
  useSelectedActions,
  useSelectedItems,
  useOutputStore,
} from "../context";

export type BrowserLinkConfig = {
  allowNavigationToBuiltInPages: boolean;
  onlyAllowedDomains: boolean;
  canSelectOnlyAllowedDomains: boolean;
  allowedDomains: string[];
  disallowedResources: string[];
  markedResources: string[];
  multiSelect: boolean;
  canCropImage: boolean;
  alwaysShowNavigationArrow: boolean;

  /** Select on click immediately, never, or after the first explicit selection. */
  clickToSelect: boolean | "after-selection";
  doubleClickToNavigate: boolean;
  clickToNavigate: boolean;

  canNavigateToCollection: boolean;
  canNavigateToManifest: boolean;
  canNavigateToCanvas: boolean;

  canSelectCollection: boolean;
  canSelectManifest: boolean;
  canSelectCanvas: boolean;
  canSelectImageService: boolean;

  customCanNavigate: null | ((resource: any, vault: Vault) => boolean);
  customCanSelect: null | ((resource: any, vault: Vault) => boolean);
};

type BrowserLinkRenderProps = {
  doubleClickToNavigate: boolean;
  isSelected: boolean;
  isNavigating: boolean;
  isMarked: boolean;
  canSelect: boolean;
  canNavigate: boolean;
  showNavigationArrow: boolean;
  renderCheckbox: () => React.ReactElement | null;
  renderDotsMenu: () => React.ReactElement | null;
  navigate: () => void;
  setSelected: (selected: boolean) => void;
};

type BrowserLinkInternalProps = {
  search?: Record<string, string>;
  manualLink?: boolean;
  manualSelect?: boolean;
  isReactAria?: boolean;
  disablePreloadOnHover?: boolean;
  ignoreAlwaysShowNavigationArrow?: boolean;
  children:
    | string
    | React.ReactElement
    | ((props: BrowserLinkRenderProps) => React.ReactElement);
  resource: { id: string; type: string };
  parent?: { id: string; type: string };
  withoutContext?: boolean;
};

type BrowserLinkProps<ET extends React.ElementType = "span"> = {
  as?: React.ElementType;
} & BrowserLinkInternalProps &
  Omit<
    React.ComponentPropsWithoutRef<ET>,
    "href" | "children" | "onClick" | "resource"
  >;

export function getBrowserLinkResource(
  inputResource: {
    id: string;
    type: string;
    parent?: { id: string; type: string };
  },
  parent?: { id: string; type: string },
) {
  return {
    ...inputResource,
    parent:
      inputResource.parent && !parent
        ? {
            id: inputResource.parent.id,
            type: inputResource.parent.type,
          }
        : parent,
  };
}

export function isDomainAllowed(link: string, allowedDomains: string[]) {
  const parseAsHttpUrl = (value: string): URL | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const hasScheme = /^[a-z][a-z\d+\-.]*:/i.test(trimmed);
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url;
  };

  let inputUrl: URL | null;
  try {
    inputUrl = parseAsHttpUrl(link);
  } catch {
    inputUrl = null;
  }
  if (!inputUrl) return false;

  const inputHostname = inputUrl.hostname.toLowerCase();

  for (const domain of allowedDomains || []) {
    let allowedUrl: URL | null;
    try {
      allowedUrl = parseAsHttpUrl(domain);
    } catch {
      allowedUrl = null;
    }
    if (!allowedUrl) continue;

    const allowedHostname = allowedUrl.hostname.toLowerCase();
    if (
      inputHostname === allowedHostname ||
      inputHostname.endsWith(`.${allowedHostname}`)
    ) {
      return true;
    }
  }

  return false;
}

export function BrowserLink<ET extends React.ElementType = "span">({
  children,
  resource: inputResource,
  as: Wrapper = "span",
  disablePreloadOnHover,
  withoutContext,
  search,
  parent: inputParent,
  manualLink,
  isReactAria,
  ignoreAlwaysShowNavigationArrow,
  ...elementProps
}: BrowserLinkProps<ET>) {
  const vault = useVault();
  const config = useLinkConfig();
  const resolve = useResolve();
  const canResolve = useCanResolve();
  const canSelectHook = useCanSelect();
  const selectedItems = useSelectedItems();
  const selectedActions = useSelectedActions();
  const parent = useMemo(() => {
    if (!inputParent) return undefined;
    return { id: inputParent.id, type: inputParent.type };
  }, [inputParent?.id, inputParent?.type]);
  const resource = useMemo(
    () => getBrowserLinkResource(inputResource, parent),
    [inputResource, parent],
  );

  const canNavigate = canResolve(resource);
  const canSelect = canSelectHook(resource);
  const outputStore = useOutputStore();
  const hasExplicitSelection = useStore(
    outputStore,
    (state) => state.wasManuallySelected && state.selectedItems.length > 0,
  );
  const selectOnClick =
    config.clickToSelect === true ||
    (config.clickToSelect === "after-selection" && hasExplicitSelection);

  const activate = useCallback(
    (modified = false, toggleSingle = false) => {
      if (selectOnClick && canSelect) {
        if (modified && config.multiSelect) {
          selectedActions.toggleItemSelection(resource);
        } else if (toggleSingle) {
          selectedActions.toggleItemSelection(resource, true);
        } else {
          selectedActions.replaceSelectedItems([resource]);
        }
      } else if (canNavigate && (config.clickToNavigate || !canSelect)) {
        // Non-selectable containers must remain browsable in selection mode.
        resolve(resource.id, { parent });
      }
    },
    [
      selectOnClick,
      canSelect,
      canNavigate,
      config.multiSelect,
      config.clickToNavigate,
      selectedActions,
      resource,
      resolve,
      parent,
    ],
  );

  const { pressProps } = usePress({
    onPress: (event) =>
      activate(
        event.shiftKey || event.ctrlKey || event.metaKey,
        event.ctrlKey || event.metaKey,
      ),
  });

  const doubleClickProps = {
    onDoubleClick: () => {
      if (config.doubleClickToNavigate && canNavigate) {
        resolve(resource.id, { parent });
      }
    },
  };

  const { isHovered, hoverProps } = useHover({
    onHoverStart: () => {
      if (!disablePreloadOnHover) {
        // @todo preload resource.
      }
    },
  });

  const isMarked = useMemo(
    () => config.markedResources.includes(resource.id),
    [config, resource.id],
  );

  const isSelected = useMemo(() => {
    return !!selectedItems.find((item) => item.id === resource.id);
  }, [selectedItems, resource.id]);

  const renderProps: BrowserLinkRenderProps = {
    isSelected,
    isNavigating: false,
    canSelect,
    canNavigate,
    isMarked,
    showNavigationArrow:
      !config.clickToNavigate ||
      selectOnClick ||
      config.doubleClickToNavigate ||
      (!ignoreAlwaysShowNavigationArrow && config.alwaysShowNavigationArrow),
    doubleClickToNavigate: config.doubleClickToNavigate,
    renderCheckbox: () => {
      return (
        <Checkbox
          slot="selection"
          isDisabled={!canSelect}
          isSelected={isSelected}
          onChange={() =>
            selectedActions.toggleItemSelection(resource, !config.multiSelect)
          }
        />
      );
    },
    renderDotsMenu: () => <div />,
    navigate: () => {
      // @todo handle parent.
      if (canNavigate) resolve(resource.id, { parent });
    },
    setSelected: (selected) => {
      selectedActions.toggleItemSelection(resource, !config.multiSelect);
    },
  };

  const wrapperProps: any = {};
  const actionModifiers = useRef({ modified: false, toggle: false });

  if (isReactAria) {
    const recordModifiers = (event: {
      shiftKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
    }) => {
      actionModifiers.current = {
        modified: event.shiftKey || event.ctrlKey || event.metaKey,
        toggle: event.ctrlKey || event.metaKey,
      };
    };
    wrapperProps.onClickCapture = recordModifiers;
    wrapperProps.onKeyDownCapture = recordModifiers;
    wrapperProps.onAction = () =>
      activate(
        actionModifiers.current.modified,
        actionModifiers.current.toggle,
      );
  } else {
    Object.assign(wrapperProps, pressProps);
  }

  return (
    <Wrapper
      {...elementProps}
      {...hoverProps}
      {...doubleClickProps}
      {...wrapperProps}
    >
      {typeof children === "function" ? children(renderProps) : children}
    </Wrapper>
  );
}
