import type { ReactNode } from "react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { Metadata } from "react-iiif-vault";
import { useBrowserContainer } from "../browser/BrowserContainer";
import { InfoIcon } from "../icons/InfoIcon";

export function ManifestMetadata({ manifest }: { manifest: any }) {
  const container = useBrowserContainer();
  if (!manifest) return null;

  const metadata = list(manifest.metadata);
  const requiredStatement = manifest.requiredStatement;
  const hasContent = metadata.length || manifest.rights || requiredStatement;

  if (!hasContent) return null;

  return (
    <DialogTrigger>
      <Button
        aria-label="Show manifest information"
        className="relative z-20 flex-shrink-0 rounded p-1 text-lg text-slate-400 outline-none hover:text-slate-600 focus:ring ring-blue-300 aria-expanded:bg-slate-100"
      >
        <InfoIcon />
      </Button>
      <Popover
        UNSTABLE_portalContainer={container || undefined}
        className="z-[70] w-[280px] max-w-[calc(100vw-1rem)] !max-h-[min(28rem,calc(100%-4rem))] overflow-y-auto rounded-md border border-gray-300 bg-white text-sm text-gray-800 shadow-lg"
        placement="bottom end"
      >
        <Dialog
          aria-label="Manifest information"
          className="p-3 outline-none"
        >
          <h2 className="font-medium text-gray-900">Manifest information</h2>
          <div className="mt-3 grid gap-3 [overflow-wrap:anywhere]">
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
        </Dialog>
      </Popover>
    </DialogTrigger>
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
