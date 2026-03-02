import { createContext, useContext, useState } from "react";
import { UNSAFE_PortalProvider } from "react-aria";
import { twMerge } from "tailwind-merge";
import { AtlasStoreProvider, useAtlasStore } from 'react-iiif-vault';

const BrowserContainerContext = createContext<HTMLDivElement | null>(null);

export function useBrowserContainer() {
  return useContext(BrowserContainerContext);
}

export const BrowserContainer = function BrowserContainer(props: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  return (
    <AtlasStoreProvider name="iiif-browser">
      <BrowserContainerContext.Provider value={ref}>
        <UNSAFE_PortalProvider getContainer={() => ref}>
          <div
            className={twMerge(
              "iiif-browser iiif-browser-root",
              props.className,
            )}
            style={{
              '--ib-icon-count': 0,
            } as any}
            ref={setRef}
          >
            {props.children}
          </div>
        </UNSAFE_PortalProvider>
      </BrowserContainerContext.Provider>
    </AtlasStoreProvider>
  );
};
