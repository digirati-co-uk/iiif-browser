import { ImageServiceLoader } from "@iiif/helpers/image-service";
import mitt from "mitt";
import { createContext, useContext, useId, useState } from "react";
import { UNSAFE_PortalProvider } from "react-aria";
import {
  type AtlasStoreEvents,
  AtlasStoreProvider,
  createAtlasStore,
  EventEmitterProvider,
  EventsProvider,
  ImageServiceLoaderContext,
  ResourceReactContext,
} from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

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
  const atlasName = `iiif-browser-${useId()}`;
  const [atlasEvents] = useState(() => mitt<AtlasStoreEvents>());
  const [atlasStore] = useState(() =>
    createAtlasStore({ events: atlasEvents }),
  );
  const [imageServiceLoader] = useState(() => new ImageServiceLoader());

  return (
    <EventsProvider emitter={atlasEvents}>
      <EventEmitterProvider emitter={atlasEvents}>
        <ImageServiceLoaderContext.Provider value={imageServiceLoader}>
          <ResourceReactContext.Provider value={{}}>
            <AtlasStoreProvider name={atlasName} existing={atlasStore}>
              <BrowserContainerContext.Provider value={ref}>
                <UNSAFE_PortalProvider getContainer={() => ref}>
                  <div
                    className={twMerge(
                      "iiif-browser iiif-browser-root",
                      props.className,
                    )}
                    style={
                      {
                        "--ib-icon-count": 0,
                      } as any
                    }
                    ref={setRef}
                  >
                    {props.children}
                  </div>
                </UNSAFE_PortalProvider>
              </BrowserContainerContext.Provider>
            </AtlasStoreProvider>
          </ResourceReactContext.Provider>
        </ImageServiceLoaderContext.Provider>
      </EventEmitterProvider>
    </EventsProvider>
  );
};
