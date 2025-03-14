import { clipboardTarget } from "./clipboard";
import { callbackTarget } from "./callback";
import { inputTarget } from "./input";
import type { ExplorerAction, OutputTarget } from "../IIIFBrowser.types";
import { openNewWindowTarget } from "./open-new-window";
import { eventEmitterTarget } from "./event-emitter";
import { downloadTarget } from "./download";

export const targets: { [K in OutputTarget["type"]]: ExplorerAction<K> } = {
  clipboard: clipboardTarget,
  callback: callbackTarget,
  input: inputTarget,
  "open-new-window": openNewWindowTarget,
  download: downloadTarget,
  eventEmitter: eventEmitterTarget,
};
