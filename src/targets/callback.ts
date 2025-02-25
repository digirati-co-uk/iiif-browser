import type { ExplorerAction } from "../IIIFBrowser.types";

export const callbackTarget: ExplorerAction<"callback"> = {
  label: "Select",
  action: (resource, ref, options) => {
    return options.cb(resource);
  },
};
