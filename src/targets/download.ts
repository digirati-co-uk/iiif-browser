import type { ExplorerAction } from "../IIIFBrowser.types";

export const downloadTarget: ExplorerAction<"download"> = {
  label: "Download",
  action: (resource, ref, options) => {
    const filename = options.filename || "iiif-resource.json";
    const content = typeof resource === "string"
      ? resource
      : JSON.stringify(resource, null, 2);

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  },
};
