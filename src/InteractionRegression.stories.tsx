import { useMemo, useState } from "react";
import { IIIFBrowser } from "./IIIFBrowser";
import { createInteractionFixture } from "./fixtures/interaction-regression";
import "./styles/lib.css";
import "./styles/tw.css";

export default { title: "IIIF Browser/Regression", component: IIIFBrowser };

function RegressionBrowser({
  presentation2 = false,
  image3 = false,
  landscape = false,
  choice = false,
  navigation = false,
  afterSelection = false,
}) {
  const fixture = useMemo(
    () =>
      createInteractionFixture({ presentation2, image3, landscape, choice }),
    [presentation2, image3, landscape, choice],
  );
  const [result, setResult] = useState<unknown>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageStatus, setImageStatus] = useState("");
  return (
    <>
      <p>
        Rotate through 0°, 90°, 180° and 270°. Crop, save, edit, cancel and
        remove the crop. Export each response below. Navigation stories start at
        a collection: use the arrows or double-click to open selectable
        resources.
      </p>
      <div style={{ height: 640, display: "flex", marginTop: 16 }}>
        <IIIFBrowser
          key={`${presentation2}:${image3}:${landscape}:${choice}:${navigation}:${afterSelection}`}
          vault={fixture.vault}
          navigation={{
            canCropImage: true,
            canSelectCollection: false,
            canSelectManifest: afterSelection,
            ...(navigation
              ? {
                  clickToNavigate: false,
                  clickToSelect: true,
                  doubleClickToNavigate: true,
                }
              : {}),
          }}
          history={{
            restoreFromLocalStorage: false,
            saveToLocalStorage: false,
            initialHistory: [
              {
                url:
                  navigation || afterSelection
                    ? fixture.collectionId
                    : fixture.manifestId,
                resource:
                  navigation || afterSelection
                    ? fixture.collectionId
                    : fixture.manifestId,
                route:
                  navigation || afterSelection
                    ? `/collection?id=${encodeURIComponent(fixture.collectionId)}`
                    : `/manifest?id=${encodeURIComponent(fixture.manifestId)}&canvas=${encodeURIComponent(fixture.canvasId)}`,
              },
            ],
          }}
          output={[
            {
              type: "callback",
              label: "Return selected state",
              supportedTypes: ["Manifest", "Canvas", "CanvasRegion"],
              format: { type: "custom", format: (resource) => resource },
              cb: setResult,
            },
            {
              type: "callback",
              label: "Return content state",
              supportedTypes: ["Canvas", "CanvasRegion"],
              format: { type: "content-state", pretty: true },
              cb: setResult,
            },
            {
              type: "callback",
              label: "Return IIIF image URL",
              supportedTypes: ["Canvas", "CanvasRegion"],
              format: { type: "image-url", width: 600 },
              cb: (value) => {
                setResult(value);
                setImageUrl(value);
                setImageStatus("Loading image");
              },
            },
          ]}
        />
      </div>
      <h2>Returned response</h2>
      <pre
        data-testid="returned-response"
        style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
      >
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
      {imageUrl && (
        <>
          <p role="status">{imageStatus}</p>
          <img
            alt="Returned IIIF image"
            src={imageUrl}
            style={{ maxWidth: "100%", maxHeight: 400 }}
            onLoad={() => setImageStatus("Image loaded")}
            onError={() => setImageStatus("Image request failed")}
          />
        </>
      )}
    </>
  );
}

export const RotationCropPresentation3 = () => <RegressionBrowser />;
export const RotationCropPresentation2 = () => (
  <RegressionBrowser presentation2 />
);
export const RotationCropImageApi3 = () => <RegressionBrowser image3 />;
export const RotationCropLandscape = () => <RegressionBrowser landscape />;
export const RotationCropChoice = () => <RegressionBrowser choice />;
export const ClickToNavigateDisabled = () => <RegressionBrowser navigation />;
export const SelectAfterFirstSelection = () => (
  <RegressionBrowser afterSelection />
);

/** Executable browser regression: camera rotation, Canvas coordinates and real Image API output. */
export const RotationCropWorkflow = {
  render: () => <RegressionBrowser />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const { within, userEvent, expect, waitFor } = await import(
      "@storybook/test"
    );
    const canvas = within(canvasElement);
    const response = () =>
      JSON.parse(canvas.getByTestId("returned-response").textContent || "null");
    for (const angle of [90, 180, 270, 0, 90]) {
      await userEvent.click(
        await canvas.findByRole("button", { name: "Rotate clockwise" }),
      );
      await userEvent.click(
        canvas.getByRole("button", { name: "Return selected state" }),
      );
      await waitFor(() => expect(response()?.rotation).toBe(angle));
    }
    await userEvent.click(canvas.getByRole("button", { name: "Crop image" }));
    await waitFor(() =>
      expect(
        canvasElement.querySelector('svg[aria-label="Drawing canvas"]'),
      ).not.toBeNull(),
    );
    const surface = canvasElement.querySelector("canvas.atlas-canvas")!;
    const bounds = surface.getBoundingClientRect();
    const start = {
      clientX: bounds.x + bounds.width / 2 - 60,
      clientY: bounds.y + bounds.height / 2 - 50,
    };
    const end = { clientX: start.clientX + 120, clientY: start.clientY + 100 };
    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: surface, coords: start },
      { target: surface, coords: end },
      { keys: "[/MouseLeft]", target: surface, coords: end },
    ]);
    await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Return selected state" }),
    );
    await waitFor(() => {
      expect(response().rotation).toBe(90);
      expect(response().selector.spatial.width).toBeGreaterThan(0);
      expect(response().selector.spatial.height).toBeGreaterThan(0);
    });
    const selection = response();
    await userEvent.click(canvas.getByRole("button", { name: "Edit crop" }));
    await userEvent.click(
      await canvas.findByRole("button", { name: "Cancel" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Return selected state" }),
    );
    expect(response().selector).toEqual(selection.selector);
    await userEvent.click(canvas.getByRole("button", { name: "More actions" }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", {
        name: "Return IIIF image URL",
      }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId("returned-response").textContent).toMatch(
        /\/90\/default\.jpg$/,
      ),
    );
    await waitFor(
      () => expect(canvas.getByRole("status").textContent).toBe("Image loaded"),
      { timeout: 20000 },
    );
  },
};
