import { IIIFPluginLogo } from "../icons/IIIFPluginLogos";

export const cookbookManifest =
  "https://iiif.io/api/cookbook/recipe/0006-text-language/manifest.json";
export const cookbookCanvas =
  "https://iiif.io/api/cookbook/recipe/0006-text-language/canvas/p1";
export function contentStatePayload(canvas = false) {
  return JSON.stringify({
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: "https://iiif.io/api/cookbook/recipe/0599-drag-and-drop/dnd-manifest",
    type: "Annotation",
    motivation: ["contentState"],
    target: canvas
      ? {
          id: cookbookCanvas,
          type: "Canvas",
          partOf: [{ id: cookbookManifest, type: "Manifest" }],
        }
      : { id: cookbookManifest, type: "Manifest" },
  });
}
export function ContentStateDragSource() {
  return (
    <p style={{ display: "flex", gap: 24 }}>
      {[false, true].map((canvas) => (
        <button
          type="button"
          key={String(canvas)}
          draggable
          onDragStart={(event) =>
            event.dataTransfer.setData(
              "text/plain",
              contentStatePayload(canvas),
            )
          }
          style={{
            cursor: "grab",
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <IIIFPluginLogo icon="stack" /> Drag cookbook{" "}
          {canvas ? "Canvas" : "Manifest"}
        </button>
      ))}
    </p>
  );
}
