import type { ExplorerAction } from "../IIIFBrowser.types";

export const eventEmitterTarget: ExplorerAction<"eventEmitter"> = {
  label: "Select",
  action: (resource, ref, options) => {
    const eventName = options.eventName || "iiif-resource-selected";
    const detail = {
      resource,
      ref,
      timestamp: new Date().toISOString(),
    };

    // Dispatch a custom event
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: options.bubbles !== false,
      cancelable: options.cancelable !== false
    });

    // Emit on specified element or default to document
    const target = options.eventTarget || document;
    if (target) {
      target.dispatchEvent(event);
    }

    return true;
  },
};
