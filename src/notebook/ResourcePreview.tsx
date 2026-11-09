import { type ReactNode, useEffect, useRef, useState } from "react";
import { CloseIcon } from "../icons/CloseIcon";
import { NotebookErrorBoundary } from "./ErrorBoundary";
import { isNotebookUrl, type NotebookResource } from "./resources";

export interface ResourcePreviewProps {
  resource: NotebookResource | null;
  href: string;
  /** Link label shown to the author; may be edited. */
  label: string;
  title: string;
  loading: boolean;
  error: string;
  editable: boolean;
  rich: boolean;
  canShowRich: boolean;
  /** Image used for the preview when the resource itself has no thumbnail. */
  image?: string;
  imageSize?: ReactNode;
  actions?: ReactNode;
  onOpen(resource?: NotebookResource | null): void;
  onClose(): void;
  onRetry(): void;
  onSaveLabel(label: string): void;
  onSwitchView(view: "text" | "rich"): void;
}

const TYPE_NAMES: Record<NotebookResource["type"], string> = {
  Manifest: "Manifest",
  Collection: "Collection",
  Canvas: "Canvas",
  ImageService: "Image service",
  Image: "Image",
  ContentState: "Content State",
};

function plural(count: number, noun: string) {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

/** Short, human description of what a link points at, e.g. "Manifest" or "Collection · 3,260 items". */
export function describeResource(resource: NotebookResource | null): string {
  if (!resource) return "Link";
  switch (resource.type) {
    case "Collection":
      return resource.totalItems
        ? `Collection · ${plural(resource.totalItems, "item")}`
        : "Collection";
    case "ContentState":
      return resource.targets?.length
        ? `Content State · ${plural(resource.targets.length, "target")}`
        : "Content State";
    case "Canvas":
      return resource.xywh ? "Canvas region" : "Canvas";
    case "ImageService":
      return resource.xywh ? "Image crop" : "Image service";
    default:
      return TYPE_NAMES[resource.type] ?? "Link";
  }
}

/** `host/path` without the scheme, for a compact single-line source. */
export function describeSource(href: string): { host: string; path: string } {
  try {
    const url = new URL(href);
    const path = `${url.pathname === "/" ? "" : url.pathname}${url.search}`;
    return { host: url.host, path };
  } catch {
    return { host: href, path: "" };
  }
}

function ExternalIcon() {
  return (
    <svg
      className="iiif-notebook__external"
      viewBox="0 0 12 12"
      width="10"
      height="10"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4.5 2.5h-2v7h7v-2M7 2.5h2.5V5M9.5 2.5 5.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An image that disappears instead of showing a broken-image glyph. */
function PreviewImage({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return null;
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(src)}
    />
  );
}

function CollectionMedia({
  resource,
  onOpen,
}: {
  resource: NotebookResource;
  onOpen(resource?: NotebookResource | null): void;
}) {
  const items = resource.items ?? [];
  const remaining = (resource.totalItems ?? 0) - items.length;
  return (
    <div className="iiif-notebook__collection-preview">
      <div className="iiif-notebook__collection-grid">
        {items.slice(0, 6).map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={`Open ${item.label}`}
            onClick={() => onOpen(item)}
          >
            {item.thumbnail && isNotebookUrl(item.thumbnail) ? (
              <PreviewImage src={item.thumbnail} />
            ) : (
              <span>{item.label}</span>
            )}
          </button>
        ))}
      </div>
      {remaining > 0 && (
        <button
          type="button"
          className="iiif-notebook__collection-more"
          onClick={() => onOpen()}
        >
          + {remaining.toLocaleString()} more
        </button>
      )}
    </div>
  );
}

function LabelEditor({
  label,
  onSave,
}: {
  label: string;
  onSave(label: string): void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);
  if (!editing)
    return (
      <div className="iiif-notebook__control-row">
        <span>Label</span>
        <button
          type="button"
          className="iiif-notebook__edit-label"
          onClick={() => {
            setDraft(label);
            setEditing(true);
          }}
        >
          Edit label
        </button>
      </div>
    );
  return (
    <form
      className="iiif-notebook__label-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        onSave(draft.trim());
        setEditing(false);
      }}
      onKeyDown={(event) => {
        // Escape cancels the edit before it is allowed to close the preview.
        if (event.key === "Escape") {
          event.stopPropagation();
          setEditing(false);
        }
      }}
    >
      <label>
        Link label
        <input
          ref={input}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <div className="iiif-notebook__label-buttons">
        <button type="submit" disabled={!draft.trim()}>
          Save label
        </button>
        <button type="button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ResourcePreview({
  resource,
  href,
  label,
  title,
  loading,
  error,
  editable,
  rich,
  canShowRich,
  image,
  imageSize,
  actions,
  onOpen,
  onClose,
  onRetry,
  onSaveLabel,
  onSwitchView,
}: ResourcePreviewProps) {
  const isCollection =
    resource?.type === "Collection" && !!resource.items?.length;
  const media =
    resource && !isCollection && image && isNotebookUrl(image) ? image : null;
  const source = isNotebookUrl(href) ? describeSource(href) : null;
  const showInfoUrl =
    !!resource?.infoUrl &&
    resource.infoUrl !== href &&
    isNotebookUrl(resource.infoUrl);
  const hasControls = editable;

  return (
    <div
      role="dialog"
      aria-label="Resource preview"
      className="iiif-notebook__card"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="iiif-notebook__card-header">
        <span className="iiif-notebook__badge" data-type={resource?.type}>
          {describeResource(resource)}
        </span>
        <button
          type="button"
          className="iiif-notebook__icon"
          aria-label="Close preview"
          onClick={onClose}
        >
          <CloseIcon aria-hidden="true" />
        </button>
      </div>

      {isCollection && resource ? (
        <CollectionMedia resource={resource} onOpen={onOpen} />
      ) : media && resource ? (
        <button
          type="button"
          className="iiif-notebook__preview-image"
          aria-label={`Open ${resource.label}`}
          tabIndex={-1}
          onClick={() => onOpen()}
        >
          <PreviewImage className="iiif-notebook__thumbnail" src={media} />
        </button>
      ) : loading ? (
        <div className="iiif-notebook__skeleton" aria-hidden="true" />
      ) : null}

      <div className="iiif-notebook__card-body">
        {resource ? (
          <button
            type="button"
            className="iiif-notebook__preview-title"
            onClick={() => onOpen()}
          >
            {title}
          </button>
        ) : (
          <strong className="iiif-notebook__preview-title">{title}</strong>
        )}
        <div className="iiif-notebook__source">
          {source ? (
            <a href={href} target="_blank" rel="noreferrer" title={href}>
              <span className="iiif-notebook__source-host">{source.host}</span>
              {source.path && (
                <span className="iiif-notebook__source-path">
                  {source.path}
                </span>
              )}
              <ExternalIcon />
            </a>
          ) : (
            <span>IIIF Content State</span>
          )}
          {showInfoUrl && resource?.infoUrl && (
            <a href={resource.infoUrl} target="_blank" rel="noreferrer">
              info.json
              <ExternalIcon />
            </a>
          )}
        </div>
      </div>

      {loading && (
        <p role="status" className="iiif-notebook__status">
          <span className="iiif-notebook__spinner" aria-hidden="true" />
          Loading preview…
        </p>
      )}

      {error && (
        <div role="alert" className="iiif-notebook__alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Retry preview
          </button>
        </div>
      )}

      {hasControls && (
        <div className="iiif-notebook__controls">
          <LabelEditor label={label} onSave={onSaveLabel} />
          {/* A malformed image service must not take the whole preview down. */}
          <NotebookErrorBoundary fallback={null} resetKey={resource}>
            {imageSize}
          </NotebookErrorBoundary>
          {canShowRich && (
            <div className="iiif-notebook__control-row iiif-notebook__view-control">
              <span>View</span>
              <div role="group" aria-label="Switch view">
                {(["text", "rich"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={rich === (view === "rich")}
                    onClick={() => onSwitchView(view)}
                  >
                    {view === "text" ? "Text" : "Rich"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {actions}

      {resource && (
        <div className="iiif-notebook__card-footer">
          <button
            type="button"
            className="iiif-notebook__primary"
            onClick={() => onOpen()}
          >
            Open
          </button>
        </div>
      )}
    </div>
  );
}
