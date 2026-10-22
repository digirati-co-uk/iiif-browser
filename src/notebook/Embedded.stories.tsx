import "../styles/lib.css";
import "../index.css";
import { useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { IIIFBrowser } from "../IIIFBrowser";
import { createNotebook, notebookPlugin } from "./index";
import { workshopNote } from "./workshop-note";
import {
  collection,
  initialNotes,
  manifest,
  resources,
  thumbnail,
} from "./story-fixtures";

export default {
  title: "Notebook/Inside the browser",
  parameters: { layout: "fullscreen" },
};

function BrowserNotebook({
  page = "home",
  showToolbarButton = true,
  showThumbnails = true,
  workshop = false,
  emptyNote = false,
}: {
  page?: "home" | "notes";
  showToolbarButton?: boolean;
  showThumbnails?: boolean;
  workshop?: boolean;
  emptyNote?: boolean;
}) {
  const [notebook] = useState(() =>
    createNotebook({
      storageKey: false,
      initialNotes: workshop
        ? [{ ...workshopNote, projectId: "delft-exhibition" }]
        : initialNotes().map((note) =>
            emptyNote
              ? {
                  ...note,
                  content: { type: "doc", content: [{ type: "paragraph" }] },
                }
              : note,
          ),
    }),
  );
  const [historyKey] = useState(() => `notebook-story:${crypto.randomUUID()}`);
  const plugins = useMemo(
    () => [
      notebookPlugin({
        notebook,
        projectId: "delft-exhibition",
        showToolbarButton,
        showThumbnails,
      }),
    ],
    [notebook, showToolbarButton, showThumbnails],
  );
  return (
    <div style={{ height: "100vh", display: "flex" }}>
      <IIIFBrowser
        plugins={plugins}
        history={{
          saveToLocalStorage: false,
          restoreFromLocalStorage: true,
          localStorageKey: historyKey,
          initialHistoryCursor: 0,
          initialHistory: [
            {
              url: `iiif://${page}`,
              route: page === "notes" ? "/notes" : "/",
              resource: null,
            },
            {
              url: manifest,
              route: `/manifest?id=${encodeURIComponent(manifest)}`,
              resource: manifest,
              metadata: {
                type: "Manifest",
                label: { en: [resources[1].label] },
              },
              thumbnail,
            },
            {
              url: collection,
              route: `/collection?id=${encodeURIComponent(collection)}`,
              resource: collection,
              metadata: {
                type: "Collection",
                label: { en: [resources[0].label] },
              },
            },
          ],
        }}
      />
    </div>
  );
}

export const Homepage = {
  render: () => <BrowserNotebook />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    const section = await app.findByRole("region", { name: "From your notes" });
    await waitFor(() =>
      expect(
        app.queryByRole("heading", { name: "Recent Collections" }),
      ).toBeNull(),
    );
    await expect(
      app.queryByRole("heading", { name: "Recent Manifests" }),
    ).toBeNull();
    await expect(
      within(section)
        .getByRole("button", { name: /Dubbel Bauernfeind-prisma/ })
        .querySelector("img"),
    ).not.toBeNull();
    await expect(
      within(section).getByRole("button", {
        name: /Dubbel Bauernfeind-prisma/,
      }),
    ).toBeVisible();
    await expect(
      within(section).queryByText("Surveying instruments"),
    ).toBeNull();
    await userEvent.click(
      within(section).getByRole("button", { name: "View notes" }),
    );
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue("Surveying instruments");
    await expect(app.queryByRole("dialog", { name: "Notebook" })).toBeNull();
    await userEvent.click(app.getByRole("button", { name: "Go Back" }));
    await expect(
      await app.findByRole("region", { name: "From your notes" }),
    ).toBeVisible();
    await userEvent.click(app.getByRole("button", { name: "Go Forward" }));
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue("Surveying instruments");
  },
};
export const ListOnHomepage = {
  render: () => <BrowserNotebook showThumbnails={false} />,
};
export const NotesAsCollections = {
  render: () => <BrowserNotebook />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await userEvent.click(await app.findByRole("button", { name: "View all" }));
    await expect(
      await app.findByRole("heading", { name: "Your notes" }),
    ).toBeVisible();
    await userEvent.click(
      app.getByRole("row", { name: "Surveying instruments" }),
    );
    await expect(
      await app.findByRole("heading", { name: "Surveying instruments" }),
    ).toBeVisible();
    await expect(
      app.getByRole("row", { name: resources[1].label }),
    ).toBeVisible();
    await expect(
      app.queryByRole("row", { name: resources[2].label }),
    ).toBeNull();
    await userEvent.click(app.getByRole("button", { name: "Go Back" }));
    await expect(
      await app.findByRole("heading", { name: "Your notes" }),
    ).toBeVisible();
    await userEvent.click(app.getByRole("button", { name: "Go Forward" }));
    await expect(
      await app.findByRole("heading", { name: "Surveying instruments" }),
    ).toBeVisible();
    await userEvent.click(
      within(app.getByRole("region", { name: "Note collection" })).getByRole(
        "button",
        { name: "Edit note" },
      ),
    );
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue("Surveying instruments");
    await expect(
      app.getByRole("button", { name: "Edit URL and show search" }),
    ).toHaveTextContent("iiif://notes?note=sources");
  },
};
export const Workshop = {
  render: () => <BrowserNotebook workshop page="notes" />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue(workshopNote.title);
    await expect(app.getAllByRole("link").length).toBeGreaterThan(30);
  },
};
export const AddToNoteAndSearch = {
  render: () => <BrowserNotebook emptyNote />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await userEvent.click(
      await app.findByRole("button", { name: resources[1].label }),
    );
    const add = await app.findByRole("button", { name: "Add to note" });
    await waitFor(() => expect(add).toBeEnabled(), { timeout: 15000 });
    await userEvent.click(add);
    await expect(await app.findByRole("status")).toHaveTextContent(
      "Added to Surveying instruments",
    );
    await userEvent.click(
      await app.findByRole("button", { name: "View in notes" }),
    );
    const content = await app.findByRole("textbox", { name: "Note content" });
    await expect(
      within(content).getAllByRole("link", { name: resources[1].label }),
    ).toHaveLength(1);
    await expect(
      content.lastElementChild?.querySelector("a")?.getAttribute("href"),
    ).toBe(manifest);
    await userEvent.click(
      app.getByRole("button", { name: "Edit URL and show search" }),
    );
    const search = await app.findByRole("textbox", {
      name: "Search commands or enter a URL to a IIIF Manifest or Collection",
    });
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(search, manifest);
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(() =>
      expect(canvasElement.querySelectorAll("[data-search-id]")).toHaveLength(
        1,
      ),
    );
    await expect(
      canvasElement.querySelector("[data-search-id]"),
    ).toHaveTextContent("from your notebook");
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(app.queryByRole("textbox", { name: "Note title" })).toBeNull(),
    );
    await waitFor(() =>
      expect(app.getByRole("button", { name: "View in notes" })).toBeEnabled(),
    );
    await expect(
      app.getByRole("button", { name: "Edit URL and show search" }),
    ).toHaveTextContent(manifest.replace("https://", ""));
    await userEvent.click(app.getByRole("button", { name: "Go Back" }));
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue("Surveying instruments");
  },
};
export const NotesPage = {
  render: () => <BrowserNotebook page="notes" />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue("Surveying instruments");
    await userEvent.click(
      app.getByRole("button", { name: /^Research questions Confirm/ }),
    );
    await expect(app.getByRole("textbox", { name: "Note title" })).toHaveValue(
      "Research questions",
    );
    await userEvent.click(app.getByRole("button", { name: "Go Back" }));
    await waitFor(() =>
      expect(app.getByRole("textbox", { name: "Note title" })).toHaveValue(
        "Surveying instruments",
      ),
    );
    await userEvent.click(app.getByRole("link", { name: resources[1].label }));
    await waitFor(() =>
      expect(app.queryByRole("textbox", { name: "Note title" })).toBeNull(),
    );
    await userEvent.click(app.getByRole("button", { name: "Go Back" }));
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toHaveValue("Surveying instruments");
    await expect(
      app.queryByRole("dialog", { name: "Notebook browser" }),
    ).toBeNull();
  },
};
export const WithoutToolbarButton = {
  render: () => <BrowserNotebook showToolbarButton={false} />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const app = within(canvasElement);
    await app.findByRole("region", { name: "From your notes" });
    await expect(
      app.getAllByRole("button", { name: "View notes" }),
    ).toHaveLength(1);
    await userEvent.click(app.getByRole("button", { name: "View notes" }));
    await expect(
      await app.findByRole("textbox", { name: "Note title" }),
    ).toBeVisible();
    await expect(app.queryByRole("button", { name: "View notes" })).toBeNull();
  },
};
