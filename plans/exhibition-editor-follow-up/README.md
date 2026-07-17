# IIIF Browser follow-up plans

These are the Browser-owned follow-ups from the supplied Exhibition Editor issue list.

| Plan | Priorities | Status | Outcome |
| --- | --- | --- | --- |
| [01 — History and selection invariants](./01-p0-p1-history-and-selection.md) | P0–P1 | Done (2026-07-17) | Collection-page URLs are reliable history entries and consumers never receive a misleading selection. |
| [02 — Crop transaction and IIIF image models](./02-p2-p3-crop-and-image-models.md) | P2–P3 | Done (2026-07-17) | Crop commits are explicit, crop mode is focused, and multi-up/Choice support has a standard data contract. |

The Manifest Editor currently records the cached-parent selection defect in `plans/exhibition-editor-issues/deferred/D1-browser-select-availability.md`. Treat the regression described there as part of plan 01 before layering crop or Choice work on top of it.

The Browser produces canonical resource selections, Canvas regions, Image Service regions, rotation, and Choice identity. It must not write manifest-editor-specific annotations or thumbnail derivatives.

The follow-up also closes the reported regressions where a cached parent Manifest
temporarily left a Canvas-only host with no actions, Canvas loading entered an
update loop, and crop Save crashed while building the selected-output thumbnail.
