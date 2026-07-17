# P0–P1 — History and selection invariants

**Status:** Done (2026-07-17)

## Objective

Ensure a collection page URL is represented in Browser history after it resolves to IIIF, and ensure resource selection is never overwritten by a late parent event. These are prerequisites for reliable Browser use inside the Exhibition Editor.

This plan covers:

- P1: opening a collection page URL rather than a manifest URL does not add it to Browser history.
- P1: the exhibition modal can end up with no useful selection / a bad selection state.

## Root paths to inspect

- `stores/browser-store.ts` resolves digital-collection pages, then uses `browserSuccess()` and `history.replace()` after redirecting to the canonical resource route.
- The cached-parent Canvas path in `resolve()` currently invokes `browserSuccess()` with the parent Manifest after routing to a Canvas. The existing editor programme records this as the late event that overwrites the Canvas selection.
- `stores/output-store.ts` is the one selection store and must remain the authority for outputs, refinements, and rotation.

## Work items

### 1. Preserve the source URL as a collection history entry

**Owned areas:** `stores/browser-store.ts`, `context.tsx` only if route/history composition needs a helper, and `__tests__/browser-digital-collections.test.ts` / `__tests__/history-route-invariants.test.ts`.

1. Reproduce with a supported collection landing-page URL and inspect the history list, linear history, cursor, persisted local-storage record, and canonical `/collection?id=…` route.
2. Define the history item explicitly: retain the user-entered page URL as `url`, use the canonical IIIF collection id as `resource`, and use the canonical collection route as `route`. Do not replace it with a manifest child or silently drop it during redirect.
3. Make direct IIIF Collection URLs, mapped digital-collection page URLs, seeded collections, reload, Back, and Forward use the same `browserSuccess`/history invariant.
4. Add regression tests that resolve a collection page URL and assert one collection entry with the expected source URL/canonical route, then verify persisted reload and Back/Forward semantics.

**Acceptance:** collection page and direct collection URL navigations are visible/reopenable in history, retain their parent context where relevant, and do not duplicate entries during loading redirects.

### 2. Prevent a parent Manifest event from replacing a Canvas selection

**Owned areas:** `stores/browser-store.ts`, `stores/output-store.ts` only if an identity guard belongs there, plus the existing selection/history tests.

1. Reproduce the cached-parent Canvas path with a parent Manifest and confirm event order. The output/host must end on the Canvas that was selected, not the parent Manifest.
2. Correct the root emitter call and resource identity at the Browser store boundary. A Canvas route should emit Canvas metadata/parent once; do not add a consumer-side filter in the Manifest Editor.
3. Audit the same path for Collection -> Manifest and manifest cache hits so a valid child selection is never overwritten by an ancestor event.
4. Add a regression that records emitted events and output-store state for cached and uncached Canvas navigation. Include hosts that cannot select a Manifest, because that is the failure mode that surfaced the bug.
5. Ensure no-selection states remain intentional: when selection is disallowed by configuration, render a disabled/recoverable state rather than stale output actions.

**Acceptance:** selecting a canvas in the embedded Browser yields one Canvas selection and a usable action; parent resource events no longer overwrite it; deliberately non-selectable resources remain clearly non-selectable.

## Completed

- [x] Preserve the user-entered collection-page URL alongside the canonical IIIF resource and route.
- [x] Emit the Canvas selection without a late parent Manifest event on cached and uncached navigation.
- [x] Keep Canvas-only output actions available immediately after navigation.
- [x] Cover mapped collection history and cached Canvas selection with regressions.

## Verification

Run the focused Browser history/selection tests. Then embed the Browser in the existing Exhibition Editor and test collection landing-page import, collection/manifest/canvas navigation, Back/Forward, modal close/reopen, and a selectable canvas output. Do not start or rebuild the editor server; record its existing version/symlink if it is not using the fixed Browser package.
