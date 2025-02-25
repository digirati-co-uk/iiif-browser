import type { BoxStyle } from "@atlas-viewer/atlas";
import type { Vault } from "@iiif/helpers/vault";
import { useState } from "react";
import { VaultProvider } from "react-iiif-vault";
import { ExplorerStoreProvider } from "./IIIFBrowser.store";
import type {
  HistoryItem,
  OutputFormat,
  OutputTarget,
  OutputType,
} from "./IIIFBrowser.types";
import { CanvasView } from "./components/CanvasView";
import { CollectionListing } from "./components/CollectionListing";
import { ExplorerEntry } from "./components/ExplorerEntry";
import { ExplorerOutput } from "./components/ExplorerOutput";
import { FilterProvider, ItemFilter } from "./components/ItemFilter";
import { ManifestListing } from "./components/ManifestListing";
import $ from "./styles/HoverCard.module.css";
import "./IIIFBrowser.css";
import { BrowserHeader } from "./components/BrowserHeader";
import { CanvasRegionView } from "./components/CanvasRegionView";

export interface IIIFBrowserProps {
  /**
   * @default {{ type: "text" }}
   */
  entry?:
    | { type: "Collection"; id: string }
    | { type: "Manifest"; id: string }
    | { type: "Text"; onlyManifests?: boolean; onlyCollections?: boolean };

  entryHistory?: Array<HistoryItem>;

  experimental_header?: boolean;

  /**
   * @default {{ type: "content-state" }}
   */
  output?: OutputFormat;

  /**
   * @default {['manifest', 'canvas', 'canvas-region']}
   */
  outputTypes?: Array<OutputType>;

  /**
   * @default {[ type: "clipboard" ]}
   */
  outputTargets?: OutputTarget[];

  allowRemoveEntry?: boolean;

  homepageCollection?: string;

  vault?: Vault;

  height?: number;
  width?: number;

  hideHeader?: boolean;

  onSelect?: () => void;
  highlightStyle?: BoxStyle;
  window?: boolean;

  onBack?: () => void;
  hideBack?: boolean;
  clearHomepageCollection?: () => void;
  onHistory?: (id: string, type: string) => void;
}

export function IIIFBrowser({
  output = { type: "content-state" },
  outputTargets = [
    {
      type: "clipboard",
      label: "Copy JSON to clipboard",
      format: { type: "json" },
    },
  ],
  outputTypes = ["Manifest", "Canvas", "CanvasRegion"],
  entry = { type: "Text" },
  vault,
  onHistory,
  hideHeader,
  allowRemoveEntry,
  homepageCollection,
  clearHomepageCollection,
  highlightStyle,
  width,
  height,
  onSelect,
  window,
  onBack,
  hideBack,
  experimental_header,
}: IIIFBrowserProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canResetLast = allowRemoveEntry || entry?.type === "Text";

  return (
    <VaultProvider vault={vault}>
      <FilterProvider>
        <ExplorerStoreProvider
          entry={entry.type !== "Text" ? entry : undefined}
          options={{ canReset: canResetLast, onHistory }}
        >
          <div
            className={$.mainContainer}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setExpanded(false);
              }
            }}
          >
            <div
              className={$.hoverCardContainer}
              data-window={window}
              data-float={expanded}
              style={{ height, maxWidth: width }}
            >
              {hideHeader || experimental_header ? null : (
                <div className={$.hoverCardHeader}>
                  <div className={$.hoverCardLabel}>Select resource</div>
                  <div
                    className={$.hoverCardAction}
                    onClick={() => setIsFilterOpen((o) => !o)}
                  >
                    <svg
                      width="14px"
                      height="10px"
                      viewBox="0 0 14 10"
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlnsXlink="http://www.w3.org/1999/xlink"
                    >
                      <g
                        id="Design-3.0"
                        stroke="none"
                        strokeWidth="1"
                        fill="none"
                        fillRule="evenodd"
                      >
                        <g
                          id="Artboard"
                          transform="translate(-1660.000000, -57.000000)"
                          fill="#9B9B9B"
                          fillRule="nonzero"
                        >
                          <g
                            id="Group-Copy-7"
                            transform="translate(1660.000000, 57.000000)"
                          >
                            <path
                              d="M5,10 L5,8 L9,8 L9,10 L5,10 Z M3,6 L3,4 L11,4 L11,6 L3,6 Z M0,2 L0,0 L14,0 L14,2 L0,2 Z"
                              id="Shape"
                            ></path>
                          </g>
                        </g>
                      </g>
                    </svg>
                  </div>
                  <div
                    className={$.hoverCardAction}
                    onClick={() => setExpanded((o) => !o)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="16"
                      viewBox="0 96 960 960"
                      width="16"
                    >
                      <path
                        d="M120 936V616h80v184l504-504H520v-80h320v320h-80V352L256 856h184v80H120Z"
                        fill="#9B9B9B"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {experimental_header ? (
                <BrowserHeader />
              ) : (
                <>
                  <ItemFilter open={isFilterOpen} />

                  <ExplorerEntry
                    entry={entry}
                    homepageCollection={homepageCollection}
                    clearHomepageCollection={clearHomepageCollection}
                    canReset={canResetLast}
                    hideBack={hideBack}
                    onBack={onBack}
                  />
                </>
              )}

              {/* Only shown if we are looking at a collection */}
              <CollectionListing />

              {/* Only shown if we are looking at a manifest */}
              <ManifestListing
                canvasMultiSelect={outputTypes?.includes("CanvasList")}
              />

              <CanvasView
                highlightStyle={highlightStyle}
                regionEnabled={outputTypes?.includes("CanvasRegion")}
              />

              <CanvasRegionView />

              <ExplorerOutput
                onSelect={onSelect}
                targets={outputTargets}
                types={outputTypes}
                format={output}
              />
            </div>
          </div>
        </ExplorerStoreProvider>
      </FilterProvider>
    </VaultProvider>
  );
}
