const AVAILABLE_TEMPLATE_VALUES = {
  collection: "COLLECTION",
  manifest: "MANIFEST",
  result: "RESULT",
  canvas: "CANVAS",
  canvasIndex: "CANVAS_INDEX",
  xywh: "XYWH",

  // Potential future ones.
  // contentStateHash: "CONTENT_STATE_HASH",
  // contentStateJson: "CONTENT_STATE_JSON",
};

/**
 * Usage example:
 * openInViewer`https://example.org/?manifest=${m => m.manifest}`;
 */
export function openInViewer(
  template: TemplateStringsArray,
  ...params: Array<(options: typeof AVAILABLE_TEMPLATE_VALUES) => string>
): string {
  let str = "";
  for (let i = 0; i < template.length; i++) {
    const param = params[i];
    let result = "";
    if (param) {
      result = param(AVAILABLE_TEMPLATE_VALUES);
    }
    str += template[i] + result;
  }

  return str;
}
