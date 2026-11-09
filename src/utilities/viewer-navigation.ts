import type { Runtime } from "@atlas-viewer/atlas";

/** Fit using the measured frame, rather than the previous viewport's aspect ratio. */
export function resetViewerHome(runtime: Runtime, rotation: number, immediate = true) {
  runtime.transitionManager.stopTransition();
  runtime.viewRotation = rotation;
  runtime.updateRendererScreenPosition();
  const target = runtime.getHomeTarget();
  if (immediate) runtime.setViewport(target);
  else runtime.transitionManager.goToRegion(target);
  runtime.updateControllerPosition();
  runtime.updateNextFrame();
}

/** Keep route/output rotation controlled while Atlas owns the camera animation. */
export function rotateViewerTo(runtime: Runtime, rotation: number) {
  const pending = runtime.transitionManager.getPendingTransition();
  const from =
    !pending.done && pending.rotation
      ? pending.rotation.to
      : runtime.viewRotation;
  const delta = ((((rotation - from + 180) % 360) + 360) % 360) - 180;
  if (delta) runtime.world.rotateBy(delta);
}
