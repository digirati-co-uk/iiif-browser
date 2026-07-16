import type { Vault } from "@iiif/helpers/vault";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import {
  CanvasContext,
  CanvasPanel,
  CollectionContext,
  LocaleString,
  ManifestContext,
  Metadata,
  useCollection,
  useManifest,
  useSimpleViewer,
  useThumbnail,
  useVault,
  VaultProvider,
} from "react-iiif-vault";
import { ArrowBackIcon } from "../icons/ArrowBackIcon";
import { ArrowForwardIcon } from "../icons/ArrowForwardIcon";
import { InfoIcon } from "../icons/InfoIcon";

export interface IIIFSnippetProviderProps {
  collectionId?: string;
  manifestId?: string;
  canvasId?: string;
  vault?: Vault;
  loading?: ReactNode;
  error?: (error: Error) => ReactNode;
  children: ReactNode;
}

/** Loads the selected resource before rendering its MDX component. */
export function IIIFSnippetProvider({
  vault,
  ...props
}: IIIFSnippetProviderProps) {
  return (
    <VaultProvider vault={vault}>
      <LoadedResource {...props} />
    </VaultProvider>
  );
}

function LoadedResource({
  collectionId,
  manifestId,
  canvasId,
  loading = <output className="iiif-snippet__status">Loading IIIF…</output>,
  error: renderError = (error) => (
    <span className="iiif-snippet__status" role="alert">
      {error.message}
    </span>
  ),
  children,
}: Omit<IIIFSnippetProviderProps, "vault">) {
  const vault = useVault();
  const resourceId = manifestId ?? collectionId;
  const [state, setState] = useState<"loading" | "ready" | Error>("loading");

  useEffect(() => {
    let active = true;
    setState("loading");

    if (!resourceId) {
      setState(new Error("A collectionId or manifestId is required."));
      return;
    }

    void vault.load(resourceId).then(
      (resource) => {
        if (active) {
          setState(
            resource ? "ready" : new Error(`Could not load ${resourceId}`),
          );
        }
      },
      (caught) => {
        if (active) {
          setState(
            caught instanceof Error ? caught : new Error(String(caught)),
          );
        }
      },
    );

    return () => {
      active = false;
    };
  }, [resourceId, vault]);

  if (state === "loading") return loading;
  if (state instanceof Error) return renderError(state);

  if (manifestId) {
    const content = canvasId ? (
      <CanvasContext canvas={canvasId}>{children}</CanvasContext>
    ) : (
      children
    );
    return <ManifestContext manifest={manifestId}>{content}</ManifestContext>;
  }

  return collectionId ? (
    <CollectionContext collection={collectionId}>{children}</CollectionContext>
  ) : null;
}

export interface IIIFSnippetBaseProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Used by the MDXEditor integration to persist drag resizing. */
  onSizeChange?: (width: number, height: number) => void;
}

export interface IIIFCollectionProps extends IIIFSnippetBaseProps {
  collectionId: string;
  navigation?: "breadcrumbs" | "button";
}

export interface IIIFManifestProps extends IIIFSnippetBaseProps {
  manifestId: string;
}

export interface IIIFCanvasProps extends IIIFSnippetBaseProps {
  manifestId: string;
  canvasId: string;
}

export function IIIFCollection({
  collectionId,
  navigation = "breadcrumbs",
  ...frameProps
}: IIIFCollectionProps) {
  const collection = useCollection({ id: collectionId });
  const vault = useVault();
  const [selection, setSelection] = useState<{
    collectionId: string;
    manifestId: string;
  } | null>(null);
  const selectedManifest =
    selection?.collectionId === collectionId ? selection.manifestId : null;
  const manifests =
    collection?.items?.filter((item) => item.type === "Manifest") ?? [];

  return selectedManifest ? (
    <IIIFSnippetProvider vault={vault} manifestId={selectedManifest}>
      <SelectedCollectionManifest
        {...frameProps}
        collection={collection}
        manifestId={selectedManifest}
        navigation={navigation}
        onBack={() => setSelection(null)}
      />
    </IIIFSnippetProvider>
  ) : (
    <SnippetFrame
      {...frameProps}
      resource={collection}
      resourceType="Collection"
    >
      {manifests.length ? (
        <ul
          className="iiif-snippet__collection-grid"
          aria-label="Collection manifests"
        >
          {manifests.map((manifest) => (
            <li key={manifest.id}>
              <CollectionManifestCard
                manifestId={manifest.id}
                onSelect={() =>
                  setSelection({ collectionId, manifestId: manifest.id })
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="iiif-snippet__empty">
          This collection has no directly linked Manifests.
        </div>
      )}
    </SnippetFrame>
  );
}

function CollectionManifestCard({
  manifestId,
  onSelect,
}: {
  manifestId: string;
  onSelect: () => void;
}) {
  const vault = useVault();
  const manifest = useManifest({ id: manifestId });
  const thumbnail = useThumbnail(
    { width: 300, height: 300, fallback: true },
    true,
    { manifestId },
  );
  const cardRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible) void vault.load(manifestId);
  }, [manifestId, vault, visible]);

  return (
    <button
      ref={cardRef}
      type="button"
      className="iiif-snippet__collection-card"
      onClick={onSelect}
    >
      <span className="iiif-snippet__collection-thumbnail">
        {thumbnail?.id ? (
          <img src={thumbnail.id} alt="" loading="lazy" />
        ) : (
          <span aria-hidden="true">IIIF</span>
        )}
      </span>
      <span className="iiif-snippet__collection-label">
        {manifest?.label ? (
          <LocaleString>{manifest.label}</LocaleString>
        ) : (
          "Manifest"
        )}
      </span>
    </button>
  );
}

function SelectedCollectionManifest({
  manifestId,
  collection,
  navigation,
  onBack,
  ...frameProps
}: IIIFSnippetBaseProps & {
  manifestId: string;
  collection: any;
  navigation: "breadcrumbs" | "button";
  onBack: () => void;
}) {
  const manifest = useManifest({ id: manifestId });
  return (
    <SnippetFrame
      {...frameProps}
      resource={manifest}
      resourceType="Manifest"
      caption={
        navigation === "breadcrumbs" ? (
          <nav
            className="iiif-snippet__breadcrumbs"
            aria-label="Collection breadcrumb"
          >
            <button type="button" onClick={onBack}>
              {collection?.label ? (
                <LocaleString>{collection.label}</LocaleString>
              ) : (
                "Collection"
              )}
            </button>
            <span aria-hidden="true">/</span>
            <span aria-current="page">
              {manifest?.label ? (
                <LocaleString>{manifest.label}</LocaleString>
              ) : (
                "Manifest"
              )}
            </span>
          </nav>
        ) : undefined
      }
    >
      {(height) => (
        <>
          <CanvasPanel manifest={manifestId} height={height} pagingEnabled>
            <ViewerOverlay />
          </CanvasPanel>
          {navigation === "button" ? (
            <button
              type="button"
              className="iiif-snippet__collection-back"
              onClick={onBack}
            >
              <ArrowBackIcon />
              <span>Collection</span>
            </button>
          ) : null}
        </>
      )}
    </SnippetFrame>
  );
}

export function IIIFManifest({ manifestId, ...frameProps }: IIIFManifestProps) {
  const manifest = useManifest({ id: manifestId });
  return (
    <SnippetViewer
      {...frameProps}
      manifestId={manifestId}
      resource={manifest}
      resourceType="Manifest"
    />
  );
}

export function IIIFCanvas({
  manifestId,
  canvasId,
  ...frameProps
}: IIIFCanvasProps) {
  const manifest = useManifest({ id: manifestId });
  return (
    <SnippetViewer
      {...frameProps}
      manifestId={manifestId}
      canvasId={canvasId}
      resource={manifest}
      resourceType="Manifest"
    />
  );
}

function SnippetViewer({
  manifestId,
  canvasId,
  resource,
  resourceType,
  ...frameProps
}: IIIFSnippetBaseProps & {
  manifestId: string;
  canvasId?: string;
  resource: any;
  resourceType: "Collection" | "Manifest";
}) {
  return (
    <SnippetFrame
      {...frameProps}
      resource={resource}
      resourceType={resourceType}
    >
      {(height) => (
        <CanvasPanel
          manifest={manifestId}
          startCanvas={canvasId}
          height={height}
          pagingEnabled
        >
          <ViewerOverlay />
        </CanvasPanel>
      )}
    </SnippetFrame>
  );
}

function SnippetFrame({
  width = 640,
  height = 420,
  className,
  style,
  resource,
  resourceType,
  onSizeChange,
  caption,
  children,
}: IIIFSnippetBaseProps & {
  resource: any;
  resourceType: "Collection" | "Manifest";
  caption?: ReactNode;
  children: ReactNode | ((height: number) => ReactNode);
}) {
  const captionHeight = 44;
  const [viewerHeight, setViewerHeight] = useState(
    Math.max(1, (typeof height === "number" ? height : 420) - captionHeight),
  );
  const latestSize = useRef({
    width: typeof width === "number" ? width : 640,
    height: typeof height === "number" ? height : 420,
  });
  const frameRef = useRef<HTMLElement>(null);
  const onSizeChangeRef = useRef(onSizeChange);

  useEffect(() => {
    onSizeChangeRef.current = onSizeChange;
  }, [onSizeChange]);

  useEffect(() => {
    const nextWidth =
      typeof width === "number"
        ? width
        : (frameRef.current?.getBoundingClientRect().width ?? 640);
    const nextHeight = typeof height === "number" ? height : 420;
    latestSize.current = { width: nextWidth, height: nextHeight };
    setViewerHeight(Math.max(1, nextHeight - captionHeight));
  }, [height, width]);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const borderBox = entry.borderBoxSize[0];
      const bounds = element.getBoundingClientRect();
      const nextWidth = Math.round(borderBox?.inlineSize ?? bounds.width);
      const nextHeight = Math.round(borderBox?.blockSize ?? bounds.height);
      latestSize.current = { width: nextWidth, height: nextHeight };
    });
    let trackingPointer = false;
    const finishResize = () => {
      if (!trackingPointer) return;
      trackingPointer = false;
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      const next = latestSize.current;
      setViewerHeight(Math.max(1, next.height - captionHeight));
      onSizeChangeRef.current?.(next.width, next.height);
    };
    const startResize = () => {
      trackingPointer = true;
      window.addEventListener("pointerup", finishResize);
      window.addEventListener("pointercancel", finishResize);
    };
    observer.observe(element);
    element.addEventListener("pointerdown", startResize);
    return () => {
      observer.disconnect();
      element.removeEventListener("pointerdown", startResize);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
    };
  }, []);

  return (
    <figure
      ref={frameRef}
      className={["iiif-snippet", className].filter(Boolean).join(" ")}
      style={{ width, height, ...style }}
    >
      <div className="iiif-snippet__viewer">
        {typeof children === "function" ? children(viewerHeight) : children}
      </div>
      <ResourceInfo resource={resource} resourceType={resourceType} />
      <figcaption className="iiif-snippet__caption">
        {caption ??
          (resource?.label ? (
            <LocaleString>{resource.label}</LocaleString>
          ) : (
            resourceType
          ))}
      </figcaption>
    </figure>
  );
}

function ViewerOverlay() {
  const { hasNext, hasPrevious, nextCanvas, previousCanvas, sequence } =
    useSimpleViewer();

  return (
    <>
      {sequence.length > 1 ? (
        <nav className="iiif-snippet__paging" aria-label="Canvas navigation">
          <button
            type="button"
            onClick={previousCanvas}
            disabled={!hasPrevious}
            aria-label="Previous canvas"
          >
            <ArrowBackIcon />
          </button>
          <button
            type="button"
            onClick={nextCanvas}
            disabled={!hasNext}
            aria-label="Next canvas"
          >
            <ArrowForwardIcon />
          </button>
        </nav>
      ) : null}
    </>
  );
}

function ResourceInfo({
  resource,
  resourceType,
}: {
  resource: any;
  resourceType: "Collection" | "Manifest";
}) {
  if (!resource) return null;
  const metadata = list(resource.metadata);
  const requiredStatement = resource.requiredStatement;

  return (
    <DialogTrigger>
      <Button
        className="iiif-snippet__info-button"
        aria-label={`Show ${resourceType} information`}
      >
        <InfoIcon />
      </Button>
      <Popover className="iiif-snippet__info-popover" placement="bottom end">
        <Dialog
          aria-label={`${resourceType} information`}
          className="iiif-snippet__info-panel"
        >
          <strong>{resourceType} information</strong>
          {resource.id ? (
            <p>
              <a href={resource.id} rel="noreferrer" target="_blank">
                {resource.id}
              </a>
            </p>
          ) : null}
          {metadata.length ? (
            <Metadata
              allowHtml
              metadata={metadata}
              showEmptyMessage={false}
              classes={metadataClasses}
            />
          ) : null}
          {resource.rights ? (
            <p>
              <strong>Rights</strong>
              <br />
              <LinkOrText value={resource.rights} />
            </p>
          ) : null}
          {requiredStatement ? (
            <Metadata
              allowHtml
              metadata={[requiredStatement]}
              showEmptyMessage={false}
              classes={metadataClasses}
            />
          ) : null}
          {!metadata.length && !resource.rights && !requiredStatement ? (
            <p>No descriptive metadata.</p>
          ) : null}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

const metadataClasses = {
  container: "iiif-snippet__metadata",
  row: "iiif-snippet__metadata-row",
  label: "iiif-snippet__metadata-label",
  value: "iiif-snippet__metadata-value",
  empty: "iiif-snippet__metadata-empty",
};

function LinkOrText({ value }: { value: string }) {
  return value.startsWith("http") ? (
    <a href={value} rel="noreferrer" target="_blank">
      {value}
    </a>
  ) : (
    value
  );
}

function list<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}
