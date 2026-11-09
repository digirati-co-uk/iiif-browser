import {
  ModalOverlay,
  type ModalOverlayProps,
  Popover,
  type PopoverProps,
} from "react-aria-components";
import { useThemeAttributes } from "./context";

/**
 * react-aria portals modals and popovers to `document.body`, outside the themed root, so they
 * carry the theme variables themselves.
 */
export function ThemedModalOverlay(props: ModalOverlayProps) {
  const { style, ...theme } = useThemeAttributes();
  return <ModalOverlay {...theme} {...props} style={props.style ?? style} />;
}

export function ThemedPopover(props: PopoverProps) {
  const { style, ...theme } = useThemeAttributes();
  return <Popover {...theme} {...props} style={props.style ?? style} />;
}
