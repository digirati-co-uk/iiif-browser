import type { Vault } from "@iiif/helpers";
import { useMemo } from "react";
import { useHover, usePress } from "react-aria";
import { useVault } from "react-iiif-vault";
import { Checkbox } from "../components/Checkbox";
import {
  useCanResolve,
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
  disablePreloadOnHover?: boolean;
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
  resource,
  as: Wrapper = "span",
  disablePreloadOnHover,
  withoutContext,
  search,
  parent,
  manualLink,
  ...elementProps
}: BrowserLinkProps<ET>) {
  const vault = useVault();
  const config = useLinkConfig();
  const resolve = useResolve();
  const canResolve = useCanResolve();
  const selectedItems = useSelectedItems();
  const selectedActions = useSelectedActions();

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
        resolve(resource.id);
      }
    },
  });

  const doubleClickProps = useMemo(
    () => ({
      onDoubleClick: () => {
        if (config.doubleClickToNavigate) {
          resolve(resource.id);
        }
      },
    }),
    [config.doubleClickToNavigate, resolve, resource.id],
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
    if (config.customCanSelect) {
      try {
        const customSelect = config.customCanSelect(resource, vault);
        if (typeof customSelect === "boolean") {
          return customSelect;
        }
      } catch (error) {
        console.error("Error in customCanSelect:", error);
      }
    }

    if (
      config.canSelectOnlyAllowedDomains &&
      !isDomainAllowed(resource.id, config.allowedDomains)
    ) {
      return false;
    }

    if (config.canSelectCanvas && resource.type === "Canvas") {
      return true;
    }
    if (config.canSelectManifest && resource.type === "Manifest") {
      return true;
    }
    if (config.canSelectCollection && resource.type === "Collection") {
      return true;
    }
    return false;
  }, []);

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
    showNavigationArrow:
      config.alwaysShowNavigationArrow || config.doubleClickToNavigate,
    doubleClickToNavigate: config.doubleClickToNavigate,
    renderCheckbox: () => {
      return (
        <Checkbox
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
      resolve(resource.id);
    },
    setSelected: (selected) => {
      selectedActions.toggleItemSelection(resource, !config.multiSelect);
    },
  };

  // @todo rest of the owl.

  return (
    <Wrapper
      {...elementProps}
      {...pressProps}
      {...hoverProps}
      {...doubleClickProps}
    >
      {typeof children === "function" ? children(renderProps) : children}
    </Wrapper>
  );
}
