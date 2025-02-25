import { createRoot } from "react-dom/client";
import { IIIFBrowser, type IIIFBrowserProps } from "./IIIFBrowser";
import { createElement } from "react";

export function create(element: HTMLElement, props: IIIFBrowserProps) {
  const root = createRoot(element);
  root.render(createElement(IIIFBrowser, props));

  return {
    update: (props: IIIFBrowserProps) => {
      root.render(createElement(IIIFBrowser, props));
    },
    umount: () => root.unmount(),
  };
}
