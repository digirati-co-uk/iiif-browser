import "../styles/lib.css";
import "../index.css";
import { useState } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { IIIFBrowser } from "../IIIFBrowser";
import {
  IIIFNotebook,
  NotebookResourceBrowser,
  createNotebook,
  notebookBrowserOutputs,
  notebookResourceHistory,
  type NotebookResource,
} from "./index";
import {
  initialNotes,
  resources,
  note,
  paragraph,
  collection,
} from "./story-fixtures";

export default {
  title: "Notebook/Browser integration",
  parameters: { layout: "fullscreen" },
};
const browserProps = {
  history: {
    restoreFromLocalStorage: false,
    saveToLocalStorage: false,
    initialHistory: [
      {
        url: collection,
        resource: null,
        route: `/loading?id=${encodeURIComponent(collection)}`,
      },
    ],
  },
};
function Controlled() {
  const [notebook] = useState(() =>
    createNotebook({ storageKey: false, initialNotes: initialNotes() }),
  );
  const [resource, setResource] = useState<NotebookResource | null>(null);
  return (
    <>
      <IIIFNotebook
        height="100vh"
        notebook={notebook}
        projectId="delft-exhibition"
        onOpenResource={setResource}
      />
      <NotebookResourceBrowser
        resource={resource}
        onClose={() => setResource(null)}
        browserProps={{
          ...browserProps,
          ui: { bookmarkButton: false },
          output: [
            ...notebookBrowserOutputs,
            {
              type: "clipboard",
              label: "Copy JSON",
              supportedTypes: ["Collection", "Manifest", "Canvas"],
              format: { type: "json", pretty: true },
            },
          ],
        }}
      />
    </>
  );
}
export const ControlledBrowser = {
  render: () => <Controlled />,
  parameters: {
    docs: {
      description: {
        story:
          "The host owns onOpenResource and the modal state. Its browserProps are the complete IIIFBrowserProps, including custom output actions and UI options.",
      },
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await app.findByRole("link", { name: resources[1].label }),
    );
    await waitFor(() =>
      expect(
        page.getByRole("dialog", { name: "Notebook browser" }),
      ).toBeVisible(),
    );
    await userEvent.click(page.getByRole("button", { name: "Close browser" }));
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Notebook browser" }),
      ).toBeNull(),
    );
  },
};
function ModalWorkspace() {
  const [open, setOpen] = useState(false);
  const [resource, setResource] = useState<NotebookResource | null>(null);
  const [notebook] = useState(() =>
    createNotebook({
      localStorageKey: "iiif-notebook-story:modal-workspace",
      restoreFromLocalStorage: true,
      saveToLocalStorage: true,
      initialNotes: initialNotes(),
    }),
  );
  return (
    <>
      <button
        type="button"
        style={{
          margin: 20,
          padding: "8px 14px",
          background: "#2563eb",
          color: "white",
          borderRadius: 6,
        }}
        onClick={() => setOpen(true)}
      >
        Open notebook
      </button>
      <ModalOverlay
        isOpen={open}
        isDismissable
        onOpenChange={setOpen}
        className="iiif-browser-mdx-overlay"
      >
        <Modal className="iiif-browser-mdx-modal">
          <Dialog
            aria-label="Research workspace"
            className="iiif-browser-mdx-dialog"
          >
            <header className="iiif-browser-mdx-header">
              {resource && (
                <button
                  type="button"
                  className="iiif-browser-mdx-back"
                  onClick={() => setResource(null)}
                >
                  ← Back to note
                </button>
              )}
              <Heading slot="title" className="iiif-browser-mdx-title">
                {resource?.label || "Research workspace"}
              </Heading>
              <button
                type="button"
                aria-label="Close workspace"
                className="iiif-browser-mdx-close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <div className="iiif-browser-mdx-browser iiif-browser">
              {resource ? (
                <IIIFBrowser
                  key={resource.source}
                  output={notebookBrowserOutputs}
                  history={{
                    ...notebookResourceHistory(resource),
                    localStorageKey: "iiif-notebook-story:modal-browser",
                    saveToLocalStorage: true,
                  }}
                  className="h-full w-full border-none rounded-none"
                />
              ) : (
                <IIIFNotebook
                  notebook={notebook}
                  projectId="delft-exhibition"
                  height="100%"
                  onOpenResource={setResource}
                />
              )}
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
export const NotebookInModal = {
  render: () => <ModalWorkspace />,
  parameters: {
    docs: {
      description: {
        story:
          "One modal swaps the notebook for a manually mounted IIIFBrowser. Back to note remounts the notebook with its selection, scroll, sidebar and current note preserved. Named local storage also survives page reloads.",
      },
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    await userEvent.click(app.getByRole("button", { name: "Open notebook" }));
    const title = await page.findByRole("textbox", { name: "Note title" });
    const before = (title as HTMLInputElement).value;
    const separator = page.getByRole("separator", {
      name: "Resize notebook sidebar",
    });
    separator.focus();
    await userEvent.keyboard("{End}");
    await userEvent.click(page.getByRole("link", { name: resources[1].label }));
    await expect(
      page.queryByRole("textbox", { name: "Note content" }),
    ).toBeNull();
    await userEvent.click(
      await page.findByRole("button", { name: "← Back to note" }),
    );
    await expect(
      await page.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue(before);
    await expect(
      page.getByRole("separator", { name: "Resize notebook sidebar" }),
    ).toHaveAttribute("aria-valuenow", "400");
    await expect(page.getAllByRole("dialog")).toHaveLength(1);
  },
};
function LinkPickerDemo() {
  const [notebook] = useState(() =>
    createNotebook({
      storageKey: false,
      initialNotes: [
        note("links", "Exhibition checklist", undefined, [
          paragraph("Collect the objects to include in the exhibition."),
        ]),
      ],
    }),
  );
  return (
    <IIIFNotebook
      notebook={notebook}
      height="100vh"
      browserProps={browserProps}
    />
  );
}
export const LinkPicker = {
  render: () => <LinkPickerDemo />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(
        app.getByRole("button", { name: "Insert IIIF link" }),
      ).not.toBeDisabled(),
    );
    await userEvent.click(
      app.getByRole("button", { name: "Insert IIIF link" }),
    );
    await waitFor(() =>
      expect(
        page.getByRole("dialog", { name: "Insert IIIF link" }),
      ).toBeVisible(),
    );
    await userEvent.click(
      page.getByRole("button", { name: "Close link picker" }),
    );
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Insert IIIF link" }),
      ).toBeNull(),
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "A single Insert IIIF link button. The browser offers labelled Collection/Manifest/Canvas links, image services, and Content State crops through its output menu.",
      },
    },
  },
};
