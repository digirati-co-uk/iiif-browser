import { workshopNote } from "./workshop-note";
import "../styles/lib.css";
import "../index.css";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import {
  IIIFNotebook,
  createNotebook,
  resourceNode,
  notebookPaste,
  type IIIFNotebookProps,
  type NotebookAction,
  type NotebookNote,
} from "./index";
import {
  initialNotes,
  note,
  paragraph,
  resources,
  service,
  image,
  manifest,
} from "./story-fixtures";

export default {
  title: "Notebook/Standalone",
  component: IIIFNotebook,
  parameters: { layout: "fullscreen" },
};
function Standalone({
  notes = initialNotes().filter(
    (note) => note.projectId === "delft-exhibition",
  ),
  ...props
}: IIIFNotebookProps & { notes?: NotebookNote[] }) {
  const [notebook] = useState(() =>
    createNotebook({ storageKey: false, initialNotes: notes }),
  );
  return (
    <IIIFNotebook
      notebook={notebook}
      projectId="delft-exhibition"
      height="100vh"
      {...props}
    />
  );
}
const review: NotebookAction = {
  id: "review",
  label: "Mark reviewed",
  isVisible: (ctx) => ctx.isTask,
  disabled: (ctx) => ctx.readOnly || ctx.checked,
  run: (ctx) => {
    ctx.setChecked();
  },
};
export const Default = {
  render: () => <Standalone />,
  parameters: {
    docs: {
      description: {
        story:
          "Default notebook, with no developer actions or custom UI. Hover for a preview and Text/Rich switch; click to open the resource browser.",
      },
    },
  },
};
export const BlankSlate = { render: () => <Standalone notes={[]} /> };
export const LabelsAndImageSizes = {
  render: () => (
    <Standalone
      notes={[
        note("image-sizes", "Image references", "delft-exhibition", [
          ...notebookPaste(`${service}/full/max/0/default.jpg`)!,
          {
            type: "paragraph",
            content: [
              {
                ...resourceNode(manifest, resources[1]),
                attrs: {
                  href: manifest,
                  resource: resources[1],
                  label:
                    "My own description of this surveying instrument, with a deliberately long label that should stay on a single line even in a narrow notebook, without moving the quick actions onto another line",
                },
              },
            ],
          },
        ]),
      ]}
    />
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement),
      page = within(document.body);
    await waitFor(
      () =>
        expect(
          app.getByRole("link", { name: "IIIF image service" }),
        ).toBeVisible(),
      { timeout: 10000 },
    );
    await userEvent.click(
      app.getByRole("button", { name: "Preview IIIF image service" }),
    );
    await userEvent.click(page.getByRole("button", { name: "Edit label" }));
    const label = page.getByRole("textbox", { name: "Link label" });
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(label, "My prism image");
    label.dispatchEvent(new Event("input", { bubbles: true }));
    await userEvent.click(page.getByRole("button", { name: "Save label" }));
    await expect(
      app.getByRole("link", { name: "My prism image" }),
    ).toBeVisible();
    await userEvent.selectOptions(
      page.getByRole("combobox", { name: "Image size" }),
      `${service}/full/320,213/0/default.jpg`,
    );
    await userEvent.click(page.getByRole("button", { name: "Rich" }));
    await waitFor(() =>
      expect(
        canvasElement.querySelector(".iiif-notebook__rich-resource img"),
      ).toHaveAttribute("src", `${service}/full/320,213/0/default.jpg`),
    );
    await userEvent.selectOptions(
      app.getByRole("combobox", { name: "Image size" }),
      `${service}/full/640,427/0/default.jpg`,
    );
    await expect(
      canvasElement.querySelector(".iiif-notebook__rich-resource img"),
    ).toHaveAttribute("src", `${service}/full/640,427/0/default.jpg`);
  },
};
export const CollectionPreview = {
  render: () => (
    <Standalone
      notes={[
        note("collection", "Collection sources", "delft-exhibition", [
          {
            type: "paragraph",
            content: [resourceNode(resources[0].source, resources[0])],
          },
        ]),
      ]}
    />
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.hover(
      within(canvasElement).getByRole("link", { name: resources[0].label }),
    );
    await waitFor(
      () =>
        expect(
          document.querySelectorAll(".iiif-notebook__collection-grid button"),
        ).toHaveLength(6),
      { timeout: 10000 },
    );
    await expect(
      within(document.body).getByRole("button", { name: "+ 3,254 more" }),
    ).toBeVisible();
  },
};
export const PasteManifest = {
  render: () => (
    <Standalone
      notes={[
        note("manifest-paste", "Instrument research", "delft-exhibition", [
          paragraph("Paste a Manifest link here."),
        ]),
      ]}
    />
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const content = within(canvasElement).getByRole("textbox", {
      name: "Note content",
    });
    await userEvent.click(content);
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      "text/plain",
      "https://heritage.tudelft.nl/iiif/manifests/015fcbc0-6ccb-4dd9-bffe-9e5b64545f6f/manifest.json",
    );
    content.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
    await waitFor(
      () =>
        expect(
          within(content).getByRole("link", {
            name: "Elektronische teller door Philips met Geiger-Müller sensor en scintillatieteller",
          }),
        ).toBeVisible(),
      { timeout: 10000 },
    );
  },
};
export const SingleAction = {
  render: () => <Standalone actions={[review]} />,
  parameters: {
    docs: {
      description: {
        story:
          "One developer action, shown inside checklist resource links and in their previews. Completing the action checks its task.",
      },
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    const button = await app.findByRole("button", { name: "Mark reviewed" });
    await userEvent.click(button);
    await expect(button).toBeDisabled();
    await expect(
      canvasElement.querySelector('li[data-type="taskItem"]'),
    ).toHaveAttribute("data-checked", "true");
  },
};
export const MultipleActions = {
  render: () => (
    <Standalone
      actions={[
        review,
        {
          id: "reopen",
          label: "Reopen",
          isVisible: (ctx) => ctx.isTask,
          disabled: (ctx) => ctx.readOnly || !ctx.checked,
          run: (ctx) => {
            ctx.setChecked(false);
          },
        },
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Two developer actions integrated into the resource highlight; both also appear in its preview.",
      },
    },
  },
};
export const CustomTags = {
  render: () => (
    <Standalone
      renderActions={(ctx) => (
        <span style={{ fontSize: 11, color: "#64748b" }}>
          {ctx.isTask ? "To catalogue" : "Research"}
        </span>
      )}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Custom tags supplied through renderActions, with no action buttons.",
      },
    },
  },
};
export const NoteQuickActions = {
  render: () => (
    <Standalone
      renderNoteActions={({ note, notebook, readOnly }) => (
        <button
          type="button"
          disabled={readOnly}
          onClick={() => {
            const copy = notebook
              .getState()
              .createNote(note.projectId, `${note.title} — copy`);
            notebook.getState().updateNote(copy.id, { content: note.content });
          }}
        >
          Duplicate
        </button>
      )}
    />
  ),
};
export const ReadOnly = { render: () => <Standalone readOnly /> };
export const Compact = {
  render: () => <Standalone height={400} defaultSidebarCollapsed />,
};
function Projects() {
  const [projectId, setProjectId] = useState("delft-exhibition");
  return (
    <>
      <label
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          height: 44,
          padding: "0 12px",
          font: "13px system-ui",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        Project{" "}
        <select
          aria-label="Project"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
        >
          <option value="delft-exhibition">Delft exhibition</option>
          <option value="conservation">Conservation</option>
          <option value="">Personal notes</option>
        </select>
      </label>
      <Standalone
        notes={initialNotes()}
        projectId={projectId || undefined}
        height="calc(100vh - 44px)"
      />
    </>
  );
}
export const ProjectContext = {
  render: () => <Projects />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await userEvent.click(
      app.getByRole("button", { name: /Research questions/ }),
    );
    await userEvent.selectOptions(
      app.getByLabelText("Project"),
      "conservation",
    );
    await expect(app.getByLabelText("Note title")).toHaveValue(
      "Conservation notes",
    );
    await userEvent.selectOptions(
      app.getByLabelText("Project"),
      "delft-exhibition",
    );
    await expect(app.getByLabelText("Note title")).toHaveValue(
      "Research questions",
    );
  },
};
export const SearchAndSidebar = {
  render: () => <Standalone />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    const search = app.getByRole("textbox", { name: "Search notes" });
    // Use the native setter so React observes the input event in Storybook's test realm.
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(search, "prism");
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(() =>
      expect(canvasElement.querySelector("mark")).toHaveTextContent("prism"),
    );
    await userEvent.click(app.getByRole("button", { name: "Clear search" }));
    const separator = app.getByRole("separator", {
      name: "Resize notebook sidebar",
    });
    separator.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(separator).toHaveAttribute("aria-valuenow", "256");
    await userEvent.click(
      app.getByRole("button", { name: "Collapse sidebar" }),
    );
    await expect(
      app.queryByRole("textbox", { name: "Search notes" }),
    ).toBeNull();
    await userEvent.click(app.getByRole("button", { name: "Open sidebar" }));
    await expect(
      app.getByRole("textbox", { name: "Search notes" }),
    ).toBeVisible();
  },
};
export const TextAndRich = {
  render: () => (
    <Standalone
      notes={[
        note("views", "Image sources", "delft-exhibition", [
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
        ]),
      ]}
      actions={[review]}
    />
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await app.findByRole("button", { name: `Preview ${resources[2].label}` }),
    );
    await userEvent.click(await page.findByRole("button", { name: "Rich" }));
    await expect(
      await app.findByRole("button", { name: "Edit IIIF image" }),
    ).toBeVisible();
    await userEvent.click(
      app.getByRole("button", { name: `Preview ${resources[2].label}` }),
    );
    await userEvent.click(await page.findByRole("button", { name: "Text" }));
    await expect(
      app.queryByRole("button", { name: "Edit IIIF image" }),
    ).toBeNull();
    await expect(
      canvasElement.querySelectorAll('li[data-type="taskItem"]'),
    ).toHaveLength(1);
  },
};
export const FormattingAndOverflow = {
  render: () => (
    <Standalone
      notes={[
        note("formatting", "Research journal", "delft-exhibition", [
          ...[1, 2, 3].map((level) => ({
            type: "heading",
            attrs: { level },
            content: [{ type: "text", text: `Heading ${level}` }],
          })),
          {
            type: "blockquote",
            content: [
              paragraph(
                "Record what you see, and distinguish it from what you infer.",
              ),
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: "center" },
            content: [{ type: "text", text: "A centred caption" }],
          },
          ...Array.from({ length: 24 }, (_, index) =>
            paragraph(
              `Observation ${index + 1}. Compare the instrument with related examples and record its maker, materials and condition.`,
            ),
          ),
        ]),
      ]}
    />
  ),
};
export const ExistingWidgets = {
  render: () => (
    <Standalone
      notes={[
        note("widgets", "Exhibition sources", "delft-exhibition", [
          {
            type: "iiifImage",
            attrs: { src: image, alt: "Bauernfeind prism", width: 420 },
          },
          {
            type: "iiifVirtualCollection",
            attrs: {
              title: "Exhibition sources",
              items: JSON.stringify([
                {
                  id: manifest,
                  type: "Manifest",
                  label: "Dubbel Bauernfeind-prisma",
                },
              ]),
              width: 620,
              height: 350,
            },
          },
        ]),
      ]}
    />
  ),
};
export const PasteLinks = {
  render: () => (
    <Standalone
      notes={[
        note("paste", "Source gathering", "delft-exhibition", [
          paragraph("Paste a source or a checklist of URLs here."),
        ]),
      ]}
      resolveResource={async (source) =>
        resources.find((resource) => resource.source === source) ?? null
      }
    />
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    const editor = await app.findByRole("textbox", { name: "Note content" });
    await userEvent.click(editor);
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      "text/plain",
      `[] ${service}/info.json\n[] ${manifest}`,
    );
    editor.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
    await waitFor(() =>
      expect(editor.querySelectorAll('li[data-type="taskItem"]')).toHaveLength(
        2,
      ),
    );
    await waitFor(() =>
      expect(within(editor).getByText(resources[2].label)).toBeVisible(),
    );
  },
};

export const ContentStates = {
  render: () => {
    const canvasId =
      "https://tu-delft-heritage.github.io/collective-access-data/iiif/objects/009d29e8-e196-451f-8422-265b6ff27fb1/canvas/0";
    const contentState = {
      type: "Annotation",
      motivation: ["contentState"],
      target: [
        {
          id: `${canvasId}#xywh=500,400,800,600`,
          type: "Canvas",
          partOf: [{ id: manifest, type: "Manifest" }],
        },
        { id: manifest, type: "Manifest" },
      ],
    };
    const source = JSON.stringify(contentState);
    return (
      <Standalone
        notes={[
          note("state", "Details to compare", "delft-exhibition", [
            paragraph("Compare this detail with the complete object."),
            {
              type: "paragraph",
              content: [
                resourceNode(source, {
                  id: source,
                  source,
                  type: "ContentState",
                  label: "Prism detail and original manifest",
                  contentState,
                  targets: [
                    {
                      id: canvasId,
                      source: canvasId,
                      type: "Canvas",
                      label: "Prism detail",
                      parent: { id: manifest, type: "Manifest" },
                      xywh: "500,400,800,600",
                    },
                    resources[1],
                  ],
                }),
              ],
            },
          ]),
        ]}
      />
    );
  },
};

export const Workshop = { render: () => <Standalone notes={[workshopNote]} /> };
