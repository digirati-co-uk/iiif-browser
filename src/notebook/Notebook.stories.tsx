import "../styles/lib.css";
import "../index.css";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useMemo, useState } from "react";
import { IIIFBrowser } from "../IIIFBrowser";
import {
  createNotebook,
  IIIFNotebook,
  type NotebookAction,
  notebookPlugin,
} from "./index";

export default {
  title: "Integrations/Notebook",
  parameters: { layout: "fullscreen" },
};

import {
  collection,
  initialNotes,
  manifest,
  thumbnail,
} from "./story-fixtures";

function ManifestEditorApp({ readOnly = false }: { readOnly?: boolean }) {
  const [notebook] = useState(() =>
    createNotebook({ storageKey: false, initialNotes: initialNotes() }),
  );
  const projectId = "delft-exhibition";
  const [drafts, setDrafts] = useState<Record<string, any[]>>({});
  const [activity, setActivity] = useState(
    "Your sources and notes stay with the project.",
  );
  const [failImport, setFailImport] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const actions = useMemo<NotebookAction[]>(
    () => [
      {
        id: "add-canvas",
        label: "Add to manifest",
        types: ["ImageService", "Image"],
        disabled: (ctx) => ctx.readOnly || ctx.checked,
        run: async (ctx) => {
          // The host application owns the actual import and decides when a task is done.
          if (failImport)
            throw new Error(
              "Import failed. The task stays open; turn off ‘Simulate import failure’ to retry.",
            );
          const id = `${ctx.resource.id}/notebook-canvas`;
          const canvas = {
            id,
            type: "Canvas",
            label: { en: [ctx.resource.label] },
            width: 3072,
            height: 2048,
            items: [
              {
                id: `${id}/page`,
                type: "AnnotationPage",
                items: [
                  {
                    id: `${id}/painting`,
                    type: "Annotation",
                    motivation: "painting",
                    target: id,
                    body: {
                      id: ctx.resource.image || ctx.resource.id,
                      type: "Image",
                      format: "image/jpeg",
                      width: 3072,
                      height: 2048,
                      ...(ctx.resource.type === "ImageService"
                        ? {
                            service: [
                              {
                                id: ctx.resource.id,
                                type: "ImageService3",
                                profile: "level2",
                              },
                            ],
                          }
                        : {}),
                    },
                  },
                ],
              },
            ],
          };
          setDrafts((previous) => ({
            ...previous,
            [ctx.projectId ?? "personal"]: [
              ...(previous[ctx.projectId ?? "personal"] ?? []).filter(
                (item) => item.id !== id,
              ),
              canvas,
            ],
          }));
          ctx.setChecked();
          setActivity(
            `Added “${ctx.resource.label}” to the manifest and completed its task.`,
          );
        },
      },
      {
        id: "cite",
        label: "Use as source",
        types: ["Manifest", "Collection", "Canvas"],
        disabled: (ctx) => ctx.readOnly,
        run: (ctx) => {
          setActivity(`Source recorded: ${ctx.resource.id}`);
          ctx.setChecked();
        },
      },
    ],
    [failImport],
  );
  const browserProps = useMemo(
    () => ({
      history: {
        restoreFromLocalStorage: false,
        saveToLocalStorage: false,
        seedCollections: [
          {
            "@context":
              "http://iiif.io/api/presentation/3/context.json" as const,
            id: collection,
            type: "Collection" as const,
            label: { en: ["TU Delft Academic Heritage · notebook selection"] },
            items: [
              {
                id: manifest,
                type: "Manifest" as const,
                items: [],
                label: { nl: ["Dubbel Bauernfeind-prisma"] },
                thumbnail: [{ id: thumbnail, type: "Image" as const }],
              },
            ],
          },
        ],
      },
    }),
    [],
  );
  const plugins = useMemo(
    () => [
      notebookPlugin({ notebook, projectId, actions, browserProps, readOnly }),
    ],
    [notebook, projectId, actions, browserProps, readOnly],
  );
  const canvases = drafts[projectId ?? "personal"] ?? [];
  return (
    <div className="notebook-demo">
      <style>{`
      .notebook-demo { background:#f8fafc; color:#334155; min-height:100vh; font:14px system-ui; padding:24px; }
      .notebook-demo__top { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
      .notebook-demo__top h1 { font:600 28px Georgia,serif; margin:8px 0; }
      .notebook-demo select, .notebook-demo__draft button { padding:8px; border:1px solid #cbd5e1; border-radius:6px; background:white; }
      .notebook-demo__grid { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(380px,1fr); gap:20px; align-items:start; }
      .notebook-demo__paper { background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px #0f172a08; }
      .notebook-demo__draft { padding:20px; margin-top:20px; }
      .notebook-demo__draft h2 { font-size:18px; margin:0 0 12px; }
      .notebook-demo__canvases { display:flex; gap:12px; margin:16px 0; }
      .notebook-demo__canvases img { width:120px; height:90px; object-fit:contain; background:#f1f5f9; }
      .notebook-demo__status { background:#eff6ff; padding:12px 16px; border-radius:7px; margin-top:16px; }
      .notebook-demo pre { overflow:auto; max-height:300px; font-size:11px; padding:12px; background:#f8fafc; }
      @media(max-width:1050px) { .notebook-demo__grid { grid-template-columns:1fr; } }
    `}</style>
      <header className="notebook-demo__top">
        <div>
          <h1>From research to exhibition</h1>
          <p>An external Manifest Editor with a shared IIIF notebook.</p>
        </div>
      </header>
      <div className="notebook-demo__grid">
        <div className="notebook-demo__paper">
          <IIIFNotebook
            notebook={notebook}
            projectId={projectId}
            actions={actions}
            browserProps={browserProps}
            readOnly={readOnly}
            renderActions={(ctx) => (
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {ctx.isTask
                  ? ctx.checked
                    ? "✓ Imported / reviewed"
                    : "Pending review"
                  : "Project"}
              </span>
            )}
          />
        </div>
        {
          <div>
            <div className="notebook-demo__paper" style={{ height: 570 }}>
              <IIIFBrowser {...browserProps} plugins={plugins} />
            </div>
            <div className="notebook-demo__paper notebook-demo__draft">
              <h2>
                Draft manifest{" "}
                <span data-testid="canvas-count">
                  {canvases.length} canvas{canvases.length === 1 ? "" : "es"}
                </span>
              </h2>
              <label>
                <input
                  type="checkbox"
                  checked={failImport}
                  onChange={(event) => setFailImport(event.target.checked)}
                />{" "}
                Simulate import failure
              </label>
              <div className="notebook-demo__canvases">
                {canvases.map((canvas) => (
                  <img
                    key={canvas.id}
                    src={canvas.items[0].items[0].body.id}
                    alt={canvas.label.en[0]}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setJsonOpen((value) => !value)}
              >
                Inspect draft JSON
              </button>
              {jsonOpen && (
                <pre>
                  {JSON.stringify(
                    {
                      "@context":
                        "http://iiif.io/api/presentation/3/context.json",
                      id: "https://manifest-editor.example/draft",
                      type: "Manifest",
                      label: { en: ["Surveying instruments"] },
                      items: canvases,
                    },
                    null,
                    2,
                  )}
                </pre>
              )}
              <p className="notebook-demo__status" role="status">
                {activity}
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  );
}
export const ManifestEditor = {
  render: () => <ManifestEditorApp />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await waitFor(() =>
      expect(
        app.getByRole("button", { name: "Add to manifest" }),
      ).toBeVisible(),
    );
    await userEvent.click(app.getByRole("button", { name: "Add to manifest" }));
    await expect(app.getByTestId("canvas-count")).toHaveTextContent("1 canvas");
    await expect(
      app.getByRole("button", { name: "Add to manifest" }),
    ).toBeDisabled();
  },
};
export const ImportFailure = {
  render: () => <ManifestEditorApp />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await userEvent.click(app.getByLabelText("Simulate import failure"));
    await waitFor(() =>
      expect(
        app.getByRole("button", { name: "Add to manifest" }),
      ).toBeVisible(),
    );
    await userEvent.click(app.getByRole("button", { name: "Add to manifest" }));
    await expect(app.getByTestId("canvas-count")).toHaveTextContent(
      "0 canvases",
    );
    await expect(
      app.getByRole("button", { name: "Add to manifest" }),
    ).not.toBeDisabled();
    await expect(
      canvasElement.querySelector('li[data-type="taskItem"]'),
    ).toHaveAttribute("data-checked", "false");
  },
};

/**

Demonstrated in Notebook/Standalone/Workshop (workshop-note.ts):

The IIIF Manifest Editor provides users with the ability to import an existing manifest and then edit it within the tool, allowing them to develop and enhance their existing IIIF as required. You can share your work in progress, and download and save the Manifest. You can browse published IIIF Collections and Manifests and examine those - perhaps to inform how to structure aspects of the metadata, or see how specific IIIF Presentation specification features have been used by other institutions.

It is a good way to learn and discover more about the possibilities the IIIF Presentation specification can afford. So before we start creating our own manifests - we will take a look at one or two examples of IIIF content so that you can see how they are structured, and view some of the metadata included with them to provide some context for our later work.

Perhaps there are one or more institutions that you are aware of which provide a link to their IIIF Manifests that you would like to select and open? If there are good examples you want to share please do!


## IIIF Manifest examples to explore today

If you don't have some specific IIIF content that you wish to view, the following is a short list of a some example IIIF Manifests and Collections from various institutes across the globe that can act as a starting point for your exploration:

### Bibliothèque nationale de France

- https://gallica.bnf.fr/iiif/ark:/12148/btv1b8626777x/manifest.json (La Bible des poëtes, Métamorphose [d'Ovide moralisée par Thomas Walleys et traduite par Colard Mansion])
- https://iiif.biblissima.fr/chateauroux/B360446201_MS0005/manifest.json (Manuscrit reconstitué : Châteauroux, Bibliothèque municipale, ms. 5 (Grandes Chroniques de France))
- https://gallica.bnf.fr/iiif/ark:/12148/btv1b52511281h/manifest.json (BnF. Bibliothèque de l'Arsenal. Ms-1124)

### University of Leeds

- https://iiif.library.leeds.ac.uk/presentation/cc/hbzcdj81 (Sketch by Marie Hartley, "The Blacksmith made all the hinges and snecks")
- https://iiif.library.leeds.ac.uk/presentation/cc/fbw7jt45 (19th century chromolithographed trade card (advertisement), R. Jaekel trade card)
- https://iiif.library.leeds.ac.uk/presentation/cc/mh4cf1hy (Coin collection, "aureus")
- https://presentation-api.dlcs-trial.digirati.io/176/leeds-imc/university-of-leeds-medieval-manuscripts (IIIF Collection with links to a number of Medieval Manuscripts held at Leeds Special Collections)

### Wellcome

- https://iiif.wellcomecollection.org/presentation/b18035723 (Wunder)
- https://iiif.wellcomecollection.org/presentation/collections/archives/MS.1978 (Notebook - Marie Curie)

### British Library

- https://bl.digirati.io/iiif/ark:/81055/vdc_100177809527.0x000001 (Foundation charter of Bordesley Abbey by Empress Matilda)
- https://bl.digirati.io/iiif/ark:/81055/vdc_100104060212.0x000001 (Missal ('The Sherborne Missal'))
- https://bl.digirati.io/iiif/ark:/81055/vdc_100057739145.0x000001 (Jacob van Maerlant, Der naturen bloeme)
- https://bl.digirati.io/iiif/ark:/81055/vdc_100101631432.0x000001 (Bugis poems)
- https://bl.digirati.io/iiif/ark:/81055/vdc_100135827579.0x000001 (Yongle dadian 永樂大典, chapters 11903-11904)

### National Library of Wales - Llyfrgell Genedlaethol Cymru

- https://damsssl.llgc.org.uk/iiif/2.0/4628556/manifest.json (The 'Hengwrt Chaucer')
- https://damsssl.llgc.org.uk/iiif/2.0/6160651/manifest.json (Peace Petition - 16/56 1923)
- https://damsssl.llgc.org.uk/iiif/2.0/1131490/manifest.json (Aberystwith and Cardigan Bay)

### Biblioteca Nacional de Portugal

- https://permalinkbnd.bnportugal.gov.pt/iiif/13436/manifest (Processionale ad usum sacri ordinis cisterciensis)
- https://permalinkbnd.bnportugal.gov.pt/iiif/13517/manifest ([Missal segundo o rito cisterciense])
- https://permalinkbnd.bnportugal.gov.pt/iiif/13934/manifest ([Bíblia])

### Leventhal Map & Education Centre, Boston Public Library

- https://collections.leventhalmap.org/search/commonwealth:3f462s93b/manifest (A map of New-England)
- https://collections.leventhalmap.org/search/commonwealth:3f463966q/manifest (Map of Boston (1874))
- https://collections.leventhalmap.org/search/commonwealth:j6733j16t/manifest (Plan for Boston (1986))

### Princeton University Library, Special Collections

- https://figgy.princeton.edu/concern/scanned_resources/82b92cb5-7b16-4f15-a8ab-aa505facd65b/manifest (State Turnpike, Historical Photograph Collection)
- https://figgy.princeton.edu/concern/scanned_resources/4e2b0909-ce4b-43ad-8a75-85ecfb61b8c1/manifest (The Sid Lapidus '59 Collection and the Age of Reason  / [curator, Steven A. Knowlton].)
- https://figgy.princeton.edu/concern/scanned_resources/ccc4a05c-78cc-4dde-9cb4-42fb2d314878/manifest (Albert Einstein in Princeton)

### University of Edinburgh

- https://librarylabs.ed.ac.uk/iiif/manifest/calendars/2016:_Cities_of_the_World.json (Civatates Orbis Terrarum)

### National Library of Scotland

- https://view.nls.uk/manifest/8397/83973981/manifest.json (Lyceum/Royal Lyceum Theatre)
- https://view.nls.uk/manifest/7492/74921376/manifest.json (Soviet posters)
- https://view.nls.uk/manifest/1334/7515/133475158/manifest.json (15th century English manuscript)


### Oxford Bodleian

- https://iiif.bodleian.ox.ac.uk/iiif/manifest/511601ba-b660-4b07-9b68-8251122c0630.json (Ashmolean Museum Evans Architectural Plans)
- https://iiif.bodleian.ox.ac.uk/iiif/manifest/e2e9eea4-e293-4d63-987f-59cfc3d3def9.json (Bodleian Library Animals on Show)

 */
