import { createContext, Fragment, useContext, type ReactNode } from "react";

/** Optional integrations stay outside the browser's core bundle. */
export interface IIIFBrowserPlugin {
  id: string;
  header?: ReactNode;
  homepage?: ReactNode;
  /** Browser pages, keyed by path (for example /notes → iiif://notes). */
  pages?: Record<string, ReactNode>;
}
export const BrowserPluginsContext = createContext<IIIFBrowserPlugin[]>([]);
export function BrowserPluginSlot({ slot }: { slot: "header" | "homepage" }) {
  return (
    <>
      {useContext(BrowserPluginsContext).map((plugin) => (
        <Fragment key={plugin.id}>{plugin[slot]}</Fragment>
      ))}
    </>
  );
}
