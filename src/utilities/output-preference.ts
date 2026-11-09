import { useState } from "react";
import type { OutputTarget } from "../stores/output-store";

// Callback functions and DOM refs cannot identify a configuration across reloads.
export function preferenceSignature(value: unknown): string {
  return JSON.stringify(value, (key, item) => {
    if (typeof item === "function" || key === "el" || key === "eventTarget")
      return undefined;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((name) => [name, item[name]]),
      );
    }
    return item;
  });
}

export function outputPreferenceKey(scope: string, outputs: OutputTarget[]) {
  // Keep keys compact and avoid copying configuration values into storage keys.
  const signature = `${scope}:${preferenceSignature(outputs)}`;
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < signature.length; index++) {
    hash ^= BigInt(signature.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `iiif-browser:default-action:v1:${hash.toString(16)}`;
}

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function usePreferredOutput(key: string, available: OutputTarget[]) {
  const [saved, setSaved] = useState(() => ({
    key,
    value: readPreference(key),
  }));
  const value = saved.key === key ? saved.value : readPreference(key);
  const first =
    available.find((output) => preferenceSignature(output) === value) ??
    available[0];
  const choose = (output: OutputTarget) => {
    const next = preferenceSignature(output);
    setSaved({ key, value: next });
    try {
      window.localStorage.setItem(key, next);
    } catch {
      /* Keep the session preference when storage is unavailable. */
    }
  };
  return {
    first,
    others: available.filter((output) => output !== first),
    choose,
  };
}
