import type { Vault } from "@iiif/helpers";
import { useCallback, useMemo } from "react";
import { useHover, usePress } from "react-aria";
import { useVault } from "react-iiif-vault";
import { Checkbox } from "../components/Checkbox";
import {
  useCanResolve,
  useCanSelect,
  useLinkConfig,
  useResolve,
  useSelectedActions,
  useSelectedItems,
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

  clickToSelect: boolean;
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

export function isDomainAllowed(link: string, allowedDomains: string[]) {
  const allowed = false;
  for (const domain of allowedDomains || []) {
    const normalisedDomain = domain
      .replace("https://", "")
      .replace("http://", "");
    const normalisedId = link.replace("https://", "").replace("http://", "");
    if (normalisedId.startsWith(normalisedDomain)) {
      return true;
    }
  }

  return allowed;
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
  }, [inputParent]);
  const resource = useMemo(
    () => ({
      ...inputResource,
      parent:
        (inputResource as any).parent && !parent
          ? {
              id: (inputResource as any).parent.id,
              type: (inputResource as any).parent.type,
            }
          : parent,
    }),
    [],
  );

  const onAction = useCallback(() => {
    if (config.clickToSelect) {
      if (!config.multiSelect) {
        selectedActions.replaceSelectedItems([resource]);

        return;
      }

      selectedActions.replaceSelectedItems([resource]);
      return;
    }

    if (config.clickToNavigate) {
      resolve(resource.id, { parent });
    }
  }, [
    config.clickToSelect,
    selectedActions,
    config.multiSelect,
    config.clickToNavigate,
    resolve,
    resource,
    parent,
  ]);

  const { isPressed, pressProps } = usePress({
    onPress: (e) => {
      const isShift = e.shiftKey;
      const isCtrl = e.ctrlKey;
      const isMeta = e.metaKey;

      if (config.clickToSelect) {
        if (!config.multiSelect) {
          if (isCtrl || isMeta) {
            selectedActions.toggleItemSelection(resource, true);
          } else {
            selectedActions.replaceSelectedItems([resource]);
          }
          return;
        }
        if (isShift) {
          selectedActions.toggleItemSelection(resource);
        } else if (isCtrl || isMeta) {
          selectedActions.toggleItemSelection(resource);
        } else {
          selectedActions.replaceSelectedItems([resource]);
        }
        return;
      }

      if (config.clickToNavigate) {
        resolve(resource.id, { parent });
      }
    },
  });

  const doubleClickProps = useMemo(
    () => ({
      onDoubleClick: () => {
        if (config.doubleClickToNavigate) {
          resolve(resource.id, { parent });
        }
      },
    }),
    [config.doubleClickToNavigate, resolve, resource.id, parent],
  );

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

  const canNavigate = useMemo(() => {
    // @todo see if parent is required for this.
    return canResolve(resource);
  }, [canResolve, resource]);

  const canSelect = useMemo(() => {
    return canSelectHook(resource);
  }, [canSelectHook, resource]);

  // @todo - get the selected item handling (list, add, remove)
  // @todo - get loading state of resource passed in.

  const isSelected = useMemo(() => {
    return !!selectedItems.find((item) => item.id === resource.id);
  }, [selectedItems, resource.id]);

  const renderProps: BrowserLinkRenderProps = {
    isSelected,
    isNavigating: false,
    canSelect,
    canNavigate,
    isMarked,
    showNavigationArrow: ignoreAlwaysShowNavigationArrow
      ? config.doubleClickToNavigate
      : config.alwaysShowNavigationArrow || config.doubleClickToNavigate,
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
      resolve(resource.id, { parent });
    },
    setSelected: (selected) => {
      selectedActions.toggleItemSelection(resource, !config.multiSelect);
    },
  };

  const wrapperProps: any = {};

  if (isReactAria) {
    wrapperProps.onAction = onAction;
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
