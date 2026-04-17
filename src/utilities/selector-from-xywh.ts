import { BoxSelector, expandTarget } from "@iiif/helpers";

export function selectorFromXYWH(xywh: string | null) {
  if (!xywh) {
    return undefined;
  }
  try {
    return expandTarget({
      type: "SpecificResource",
      source: { id: "a", type: "any" },
      selector: {
        type: "FragmentSelector",
        value: `xywh=${xywh}`,
      },
    }).selector as BoxSelector;
  } catch (error) {
    // ignore
  }
  return undefined;
}
