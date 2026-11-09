import {
  resourceNode,
  type NotebookNote,
  type NotebookResource,
} from "./index";
export const collection = "https://heritage.tudelft.nl/iiif/collection.json";
export const manifest =
  "https://heritage.tudelft.nl/iiif/manifests/009d29e8-e196-451f-8422-265b6ff27fb1/manifest.json";
export const service =
  "https://dlc.services/iiif-img/v3/7/18/f7db2918-13fc-4151-9c45-76a9e30adb52";
export const thumbnail =
  "https://dlc.services/thumbs/v3/7/18/f7db2918-13fc-4151-9c45-76a9e30adb52/full/max/0/default.jpg";
export const image = `${service}/full/640,/0/default.jpg`;
export const resources: NotebookResource[] = [
  {
    id: collection,
    source: collection,
    type: "Collection",
    label: "TU Delft Academic Heritage",
  },
  {
    id: manifest,
    source: manifest,
    type: "Manifest",
    label: "Dubbel Bauernfeind-prisma",
    thumbnail,
  },
  {
    id: service,
    source: `${service}/info.json`,
    type: "ImageService",
    label: "Bauernfeind prism",
    thumbnail,
    image,
  },
  {
    id: thumbnail,
    source: thumbnail,
    type: "Image",
    label: "Reference photograph",
    thumbnail,
    image: thumbnail,
  },
];
export const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
export function note(
  id: string,
  title: string,
  projectId: string | undefined,
  content: NotebookNote["content"]["content"],
): NotebookNote {
  return {
    id,
    title,
    projectId,
    content: { type: "doc", content },
    createdAt: "2026-09-18T09:00:00Z",
    updatedAt: "2026-09-18T09:00:00Z",
  };
}
export function initialNotes() {
  return [
    note("sources", "Surveying instruments", "delft-exhibition", [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "A collection in the making" }],
      },
      paragraph(
        "Build a small exhibition of surveying instruments. Keep provenance beside the images and tick off each source as it enters the manifest.",
      ),
      ...resources.slice(0, 2).map((resource) => ({
        type: "paragraph",
        content: [resourceNode(resource.source, resource)],
      })),
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Ready to import" }],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [resourceNode(resources[2].source, resources[2])],
              },
            ],
          },
        ],
      },
      paragraph(
        "Compare the catalogue descriptions and record any differences before publishing.",
      ),
    ]),
    note("research", "Research questions", "delft-exhibition", [
      paragraph(
        "Confirm maker and date before publishing. Compare the prism with related instruments.",
      ),
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [paragraph("Check the catalogue description")],
          },
        ],
      },
    ]),
    note("other", "Conservation notes", "conservation", [
      paragraph(
        "This project has its own notes and remembers its last opened note.",
      ),
      { type: "paragraph", content: [resourceNode(thumbnail, resources[3])] },
    ]),
    note("personal", "Reading list", undefined, [
      paragraph(
        "A global notebook can live anywhere, independently of the browser.",
      ),
    ]),
  ];
}
