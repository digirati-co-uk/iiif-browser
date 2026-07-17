# P2–P3 — Crop transaction and IIIF image models

**Status:** Done (2026-07-17)

## Objective

Make crop output transactional, keep crop mode free of unrelated controls, then extend the Browser deliberately for multi-up and Choice images. Do not ship image-model support on top of the unresolved P0–P1 selection invariant.

This plan covers:

- P2: an unsaved crop appears to work.
- P2: hide extra Browser UI while crop mode is active.
- P3: broken cropped-image thumbnails (Browser-owned selection/preview portion).
- P3: cropping multi-up images.
- P3: Choice support, including multispectral-style alternatives.

## Existing building blocks

- `CanvasControls.tsx` starts `useRequestAnnotation()` and commits through `saveAnnotationResponse()` -> `refineSelectedItem()`.
- `CropAnnotationControls.tsx` currently calls Atlas `completeRequest()` directly.
- `output-store.ts` stores the committed selector/rotation; `CurrentCanvasRefinement.tsx` and `ManifestCanvasViewer.tsx` read it.
- `CanvasThumbnailImage.tsx` currently asks for an ordinary canvas thumbnail and has no explicit selection-aware request.

## Work items

### 1. Model crop as draft -> Save or Cancel -> committed selector

**Owned areas:** `CanvasControls.tsx`, `CropAnnotationControls.tsx`, `CurrentCanvasRefinement.tsx`, output-store tests, and a focused interaction test/Storybook scenario.

1. Trace Atlas request lifecycle and distinguish transient sketch geometry from `OutputStore.selectedItems[].selector`. No caller may refine the selected item until the save response is confirmed and not cancelled.
2. Give the active crop request explicit Save, Cancel, Escape, and Back handling. Cancel/Back/Escape restore explore mode and leave the previously committed selector unchanged; if no selector existed, output remains uncropped.
3. Make Save commit exactly the returned `BoxSelector`, emit one refinement event, update URL `xywh` after commit, and return to explore mode. A re-edit starts with the committed selector.
4. Add regressions for new crop cancel, re-edit cancel, new crop save, re-edit save, and route reload. Assert selected output and formatted `CanvasRegion`/`ImageServiceRegion`, not only visual boxes.

**Acceptance:** drawing without Save never changes Browser output; Save changes it once; cancel paths preserve the previous crop; URL and output agree after reload.

### 2. Focus crop-mode UI on the crop task

**Owned areas:** `CanvasControls.tsx`, `CropAnnotationControls.tsx`, `resources/ManifestCanvasViewer.tsx`, and style/interaction tests.

1. Enumerate controls visible in Atlas `sketch` mode. While the crop request is active, show only the needed crop affordances (edit/draw state, Save, Cancel) and keep standard zoom/rotation/remove/thumbnail/navigation controls from competing with the request.
2. Preserve keyboard escape and screen-reader labels. Do not hide controls by CSS alone if they remain focusable.
3. Restore all normal controls exactly when the request settles, including on errors and component unmount.

**Acceptance:** crop mode has one clear exit path and no duplicate/conflicting toolbars; normal Browser controls return after every settled request.

### 3. Make selection-aware thumbnails intentional

**Owned areas:** `CanvasThumbnailImage.tsx`, `hooks/use-thumbnail.ts` or an adjacent helper, `resources/CanvasGridSnippet.tsx`, and thumbnail tests.

1. Separate navigation thumbnails from output-preview thumbnails. Manifest grid/list thumbnails should keep showing the uncropped canvas unless their purpose is to preview the committed selection.
2. Where a component represents the selected output, request a thumbnail using the committed selector and Image API region. Do not mutate canonical canvas thumbnail data or derive files.
3. Test uncropped, committed crop, removed crop, and malformed/unavailable Image API service behaviour. Fall back to the ordinary canvas thumbnail rather than a broken image.
4. Hand the same selector contract to the Manifest Editor/viewer so their cropped-thumbnail plans can reuse it without Browser-specific fields.

**Acceptance:** output previews show a committed crop, navigation thumbnails do not mysteriously change, and bad data degrades safely.

### 4. Support crop selection for multi-up canvases

**Owned areas:** `resources/ManifestCanvasViewer.tsx`, `CanvasControls.tsx`, output formats, and image/canvas selection helpers.

1. Add fixtures with multiple painting annotations on one Canvas. Identify whether the current Atlas view represents the full canvas composition or a single active painting before enabling crop.
2. Use a canonical Canvas-space `BoxSelector` when the crop applies to the composite canvas. For Image Service output, require a concrete selected painting/image service and transform only through established IIIF Image API mapping.
3. If there is no unambiguous selected source, ask the user to choose the painting or disable the Image Service crop action with an explanatory state. Never apply one crop to every painting body.
4. Verify rotation, crop removal, output formatting, URL state, and thumbnail fallback for both a single image and multi-up fixture.

**Acceptance:** multi-up crop output states exactly what it targets, retains the complete composition when appropriate, and cannot silently crop the wrong source.

### 5. Add explicit IIIF Choice alternatives

**Owned areas:** image/canvas resource resolution, `CanvasControls.tsx` or a small chooser near the viewer, output formats, and fixtures/tests.

1. Parse standard IIIF `Choice` bodies from painting annotations without treating them as arbitrary arrays. Choose the default item deterministically when no selection exists.
2. Provide a compact accessible chooser only when alternatives are present. Persist the chosen alternative in the Browser selection/output identity using standard IIIF references, not an editor-only index.
3. Make canvas/image-service output, crop, rotation, and selection-aware thumbnail logic operate on the chosen alternative. A multispectral fixture must prove alternatives with different services do not overwrite one another.
4. Define unsupported nested/heterogeneous Choice behaviour up front: show a safe default/disabled action with an error boundary, rather than selecting an arbitrary image.
5. Publish the selected-alternative contract to the viewer and editor plans before they add rendering support.

**Acceptance:** simple and multispectral-style Choice images are selectable, output/crop the selected alternative, and unsupported shapes remain recoverable.

## Completed contract

- [x] Crop geometry is a draft until Save; Cancel, Escape, Back, errors, and unmount do not commit it.
- [x] Crop mode hides normal viewer/navigation controls and restores them after settling.
- [x] `selector` is the canonical Canvas-space crop; `imageSelector` is the mapped selected-image crop.
- [x] `selectedPainting` identifies the standard IIIF image id, painting annotation id, optional Image Service, and Choice identity.
- [x] Output previews use the committed selected-image region and fall back to the normal Canvas thumbnail on malformed services.
- [x] Multi-up canvases require an explicit image source for Image Service output.
- [x] Simple Choice alternatives persist by IIIF id and update the active CanvasPanel instance; unsupported complex choices remain recoverable.
- [x] The Canvas loading update loop and crop Save thumbnail exception are covered by the corrected lifecycle and defensive preview path.

## Verification order

1. Land the P0–P1 selection/history regressions first.
2. Run crop transaction and crop-mode keyboard tests.
3. Add single-image, multi-up, and Choice fixture coverage for output formatting and thumbnails.
4. Run embedded Manifest Editor checks only after the Browser package actually resolves to the fixed code. Do not make host-specific changes to bypass a Browser failure.
