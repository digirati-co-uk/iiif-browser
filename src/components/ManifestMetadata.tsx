import type { ReactNode } from "react";
import { Metadata } from "react-iiif-vault";

export function ManifestMetadata({ manifest }: { manifest: any }) {
  if (!manifest) return null;

  const metadata = list(manifest.metadata);
  const requiredStatement = manifest.requiredStatement;
  const hasContent = metadata.length || manifest.rights || requiredStatement;

  if (!hasContent) return null;

  return (
    <details className="absolute left-2 top-2 z-[60] bg-white max-h-[calc(100%-50px)] max-w-[280px] overflow-y-auto rounded-md border border-gray-300 bg-white/85 text-sm text-gray-800 shadow-sm backdrop-blur open:flex open:w-[280px] open:flex-col open:shadow-lg">
      <summary className="sticky top-0 py-2 px-3 bg-white cursor-pointer select-none font-medium text-gray-900">
        Manifest information
      </summary>
      <div className="mt-3 px-3 pb-2 grid min-h-0 flex-1 gap-3 overflow-y-auto [overflow-wrap:anywhere]">
        {metadata.length ? (
          <Metadata
            allowHtml
            classes={metadataClasses}
            metadata={metadata}
            showEmptyMessage={false}
          />
        ) : null}

        {manifest.rights ? (
          <MetadataSection title="Rights">
            <LinkOrText value={manifest.rights} />
          </MetadataSection>
        ) : null}

        {requiredStatement ? (
          <Metadata
            allowHtml
            classes={metadataClasses}
            metadata={[requiredStatement]}
            showEmptyMessage={false}
          />
        ) : null}
      </div>
    </details>
  );
}

const metadataClasses = {
  container: "w-full block [&>tbody]:block",
  row: "flex flex-col py-1.5 w-full",
  label: "text-gray-600 w-full text-sm font-semibold mb-1",
  value:
    "block w-full text-sm text-gray-800 whitespace-pre-wrap [overflow-wrap:anywhere] [&_a]:text-blue-700 [&_a]:underline [&_a:hover]:text-blue-900",
  empty: "text-gray-400",
};

function MetadataSection(props: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-medium text-gray-600">{props.title}</h2>
      <div className="break-words">{props.children}</div>
    </div>
  );
}

function LinkOrText({ value, text }: { value: string; text?: string }) {
  return value.startsWith("http") ? (
    <a
      className="text-blue-700 underline hover:text-blue-900"
      href={value}
      rel="noreferrer"
      target="_blank"
    >
      {text || value}
    </a>
  ) : (
    <span>{text || value}</span>
  );
}

function list<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}
