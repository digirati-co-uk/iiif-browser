import { Vault } from "@iiif/helpers";

export const regressionRoot = "https://example.org/iiif-regression";
export const regressionService =
  "https://iiif.wellcomecollection.org/image/b18035759_0001.JP2";
export const regressionV3Service =
  "https://iiif.io/api/image/3.0/example/reference/85a96c630f077e6ac6cb984f1b752bbf-0-21198-zz00022840-1-page1";

/** Local Presentation fixtures; only image pixels/info.json use public IIIF services. */
export function createInteractionFixture({
  presentation2 = false,
  image3 = false,
  landscape = false,
  choice = false,
} = {}) {
  const vault = new Vault();
  const manifestId = `${regressionRoot}/manifest`;
  const collectionId = `${regressionRoot}/collection`;
  image3 = image3 || landscape;
  const serviceId = landscape
    ? "https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen"
    : image3
      ? regressionV3Service
      : regressionService;
  const width = landscape ? 4032 : image3 ? 1523 : 3043;
  const height = landscape ? 3024 : image3 ? 2105 : 3744;
  const body = () => ({
    id: `${serviceId}/full/${image3 ? "max" : "full"}/0/default.jpg`,
    type: "Image",
    format: "image/jpeg",
    width,
    height,
    service: [
      {
        id: serviceId,
        type: image3 ? "ImageService3" : "ImageService2",
        profile: image3 ? "level1" : "http://iiif.io/api/image/2/level2.json",
        width,
        height,
      },
    ],
  });
  const canvases = [1, 2].map((index) => ({
    id: `${manifestId}/canvas/${index}`,
    type: "Canvas",
    label: { en: [`Page ${index}`] },
    width,
    height,
    items: [
      {
        id: `${manifestId}/page/${index}`,
        type: "AnnotationPage",
        items: [
          {
            id: `${manifestId}/painting/${index}`,
            type: "Annotation",
            motivation: "painting",
            target: `${manifestId}/canvas/${index}`,
            body: choice
              ? {
                  type: "Choice",
                  items: [
                    body(),
                    {
                      ...body(),
                      id: `${serviceId}/full/600,/0/default.jpg`,
                      label: { en: ["Alternate source"] },
                    },
                  ],
                }
              : body(),
          },
        ],
      },
    ],
  }));
  const manifest = {
    id: manifestId,
    type: "Manifest",
    label: { en: ["Rotation and navigation fixtures"] },
    items: canvases,
  };
  if (presentation2) {
    vault.loadSync(manifestId, {
      "@context": "http://iiif.io/api/presentation/2/context.json",
      "@id": manifestId,
      "@type": "sc:Manifest",
      label: "Presentation 2 regression",
      sequences: [
        {
          "@id": `${manifestId}/sequence`,
          "@type": "sc:Sequence",
          canvases: canvases.map((canvas, index) => ({
            "@id": canvas.id,
            "@type": "sc:Canvas",
            label: `Page ${index + 1}`,
            width: canvas.width,
            height: canvas.height,
            images: [
              {
                "@id": `${canvas.id}/annotation`,
                "@type": "oa:Annotation",
                motivation: "sc:painting",
                on: canvas.id,
                resource: {
                  "@id": body().id,
                  "@type": "dctypes:Image",
                  format: "image/jpeg",
                  width,
                  height,
                  service: {
                    "@id": serviceId,
                    "@context": "http://iiif.io/api/image/2/context.json",
                    profile: "http://iiif.io/api/image/2/level2.json",
                    width,
                    height,
                  },
                },
              },
            ],
          })),
        },
      ],
    } as any);
  } else vault.loadSync(manifestId, manifest as any);
  vault.loadSync(collectionId, {
    id: collectionId,
    type: "Collection",
    label: { en: ["Regression collection"] },
    items: [{ id: manifestId, type: "Manifest", label: manifest.label }],
  });
  return {
    vault,
    manifestId,
    collectionId,
    canvasId: canvases[0].id,
    serviceId,
    width,
    height,
  };
}
