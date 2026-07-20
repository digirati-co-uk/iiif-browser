import { Vault } from "@iiif/helpers";
import { ImageServiceLoader } from "@iiif/helpers/image-service";
import mitt from "mitt";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AtlasStoreEvents,
  AtlasStoreProvider,
  createAtlasStore,
  EventEmitterProvider,
  EventsProvider,
  ImageServiceLoaderContext,
  ResourceReactContext,
  useAtlasStore,
  useEmitter,
  useEventEmitter,
  useImageServiceLoader,
  useResourceContext,
  useVault,
  VaultProvider,
} from "react-iiif-vault";
import { describe, expect, it } from "vitest";
import { BrowserContainer } from "../src/browser/BrowserContainer";
import { BrowserProvider } from "../src/context";

describe("BrowserContainer", () => {
  it("does not inherit ambient viewer contexts", () => {
    const ambientEmitter = mitt<AtlasStoreEvents>();
    const ambientAtlas = createAtlasStore({ events: ambientEmitter });
    const ambientEvents = mitt<any>();
    const ambientLoader = new ImageServiceLoader();
    let browserStore: ReturnType<typeof useAtlasStore> | undefined;
    let browserEmitter: ReturnType<typeof useEmitter> | undefined;
    let browserEvents: ReturnType<typeof useEventEmitter> | undefined;
    let browserLoader: ReturnType<typeof useImageServiceLoader> | undefined;
    let browserResources: ReturnType<typeof useResourceContext> | undefined;

    function Probe() {
      browserStore = useAtlasStore();
      browserEmitter = useEmitter();
      browserEvents = useEventEmitter();
      browserLoader = useImageServiceLoader();
      browserResources = useResourceContext();
      return null;
    }

    renderToStaticMarkup(
      <EventsProvider emitter={ambientEvents}>
        <EventEmitterProvider emitter={ambientEmitter}>
          <ImageServiceLoaderContext.Provider value={ambientLoader}>
            <ResourceReactContext.Provider value={{ canvas: "ambient" }}>
              <AtlasStoreProvider existing={ambientAtlas}>
                <BrowserContainer>
                  <Probe />
                </BrowserContainer>
              </AtlasStoreProvider>
            </ResourceReactContext.Provider>
          </ImageServiceLoaderContext.Provider>
        </EventEmitterProvider>
      </EventsProvider>,
    );

    expect(browserStore).toBeDefined();
    expect(browserStore).not.toBe(ambientAtlas);
    expect(browserEmitter).not.toBe(ambientEmitter);
    expect(browserEvents).not.toBe(ambientEvents);
    expect(browserEvents).toBe(browserEmitter);
    expect(browserEmitter).toBe(browserStore?.getState().polygons.emitter);
    expect(browserLoader).not.toBe(ambientLoader);
    expect(browserResources?.canvas).toBeUndefined();

    let ambientRequests = 0;
    let browserRequests = 0;
    ambientEmitter.on("atlas.annotation-request", () => ambientRequests++);
    browserEmitter?.on("atlas.annotation-request", () => browserRequests++);
    const ambientRequest = ambientAtlas.getState().getRequestId().requestId;
    const browserRequest = browserStore?.getState().getRequestId().requestId;

    void ambientAtlas
      .getState()
      .requestAnnotation({ type: "box" }, { requestId: ambientRequest });
    expect([ambientRequests, browserRequests]).toEqual([1, 0]);

    void browserStore
      ?.getState()
      .requestAnnotation({ type: "box" }, { requestId: browserRequest! });
    expect([ambientRequests, browserRequests]).toEqual([1, 1]);
    expect(ambientAtlas.getState().tool.requestId).toBe(ambientRequest);
    expect(browserStore?.getState().tool.requestId).toBe(browserRequest);

    ambientAtlas.getState().cancelRequest(ambientRequest);
    browserStore?.getState().cancelRequest(browserRequest);
  });

  it("uses a private Vault unless one is explicitly supplied", () => {
    const ambientVault = new Vault();
    let browserVault: Vault | undefined;

    function Probe() {
      browserVault = useVault();
      return null;
    }

    renderToStaticMarkup(
      <VaultProvider vault={ambientVault}>
        <BrowserProvider>
          <Probe />
        </BrowserProvider>
      </VaultProvider>,
    );
    expect(browserVault).not.toBe(ambientVault);

    renderToStaticMarkup(
      <BrowserProvider vault={ambientVault}>
        <Probe />
      </BrowserProvider>,
    );
    expect(browserVault).toBe(ambientVault);
  });
});
