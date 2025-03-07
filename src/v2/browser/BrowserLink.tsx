import { useMemo } from "react";
import { useHover, usePress } from "react-aria";
import { Checkbox } from "../components/Checkbox";
import {
  useCanResolve,
  useLinkConfig,
  useResolve,
  useSelectedActions,
  useSelectedItems,
} from "../context";
import { MenuIcon } from "../icons/MenuIcon";

export type BrowserLinkConfig = {
  allowNavigationToBuiltInPages: boolean;
  onlyAllowedDomains: boolean;
  allowedDomains: string[];
  disallowedResources: string[];
  markedResources: string[];
  multiSelect: boolean;

  clickToSelect: boolean;
  doubleClickToNavigate: boolean;
  clickToNavigate: boolean;

  canNavigateToCollection: boolean;
  canNavigateToManifest: boolean;
  canNavigateToCanvas: boolean;

  canSelectCollection: boolean;
  canSelectManifest: boolean;
  canSelectCanvas: boolean;
};

type BrowserLinkRenderProps = {
  doubleClickToNavigate: boolean;
  isSelected: boolean;
  isNavigating: boolean;
  isMarked: boolean;
  canSelect: boolean;
  canNavigate: boolean;
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
  children: (props: BrowserLinkRenderProps) => React.ReactElement;
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
          selectedActions.selectItem(resource);
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
      {children(renderProps)}
    </Wrapper>
  );
}
