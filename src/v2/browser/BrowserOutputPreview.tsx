import {
  LocaleString,
  useCanvas,
  useCollection,
  useManifest,
} from "react-iiif-vault";
import { useSelectedItems } from "../context";
import { CropIcon } from "../icons/CropIcon";
import { MultiImageIcon } from "../icons/MultiImageIcon";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";
import type { SelectedItem } from "../stores/output-store";

export function BrowserOutputPreview() {
  const selectedItems = useSelectedItems();

  // Option 1. Only a single resource
  if (selectedItems.length === 1) {
    const item = selectedItems[0]!;

    if (item.type === "Manifest") {
      return <RenderSelectedManifest id={item.id} />;
    } else if (item.type === "Collection") {
      return <RenderSelectedCollection id={item.id} />;
    } else if (item.type === "Canvas") {
      return <RenderSelectedCanvas item={item} />;
    }
    return <div />;
  }

  return <RenderSelectedListOfManyTypes items={selectedItems} />;
}

function RenderSelectedManifest({ id }: { id: string }) {
  const manifest = useManifest({ id });

  if (!manifest) {
    return <div />;
  }

  return (
    <div className="flex flex-row items-center gap-2 w-full overflow-hidden truncate">
      <PortalResourceIcon type="manifest" />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <div className="flex items-center gap-2 w-full">
          <LocaleString as="span" className="truncate">
            {manifest.label}
          </LocaleString>
        </div>
        <a
          className="text-blue-500 hover:underline truncate text-xs"
          href={manifest.id}
          target="_blank"
          rel="noopener noreferrer"
        >
          {manifest.id}
        </a>
      </div>
    </div>
  );
}

function RenderSelectedCollection({ id }: { id: string }) {
  const collection = useCollection({ id });

  if (!collection) {
    return <div />;
  }

  return (
    <div className="flex flex-row items-center gap-2 w-full overflow-hidden truncate">
      <PortalResourceIcon type="collection" />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <div className="flex items-center gap-2 w-full">
          <LocaleString as="span" className="truncate">
            {collection.label}
          </LocaleString>
        </div>
        <a
          className="text-blue-500 hover:underline truncate text-xs"
          href={collection.id}
          target="_blank"
          rel="noopener noreferrer"
        >
          {collection.id}
        </a>
      </div>
    </div>
  );
}

function RenderSelectedCanvas({ item }: { item: SelectedItem }) {
  const manifest = useManifest({ id: item.parent?.id! });
  const canvas = useCanvas({ id: item.id })!;

  return (
    <div className="flex flex-row items-center gap-2 w-full overflow-hidden truncate">
      {item.selector ? (
        <div className="text-3xl text-[#F58962]">
          <CropIcon />
        </div>
      ) : (
        <PortalResourceIcon type="canvas" />
      )}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <div className="flex items-center gap-2 w-full">
          {manifest ? (
            <>
              <LocaleString as="span" className="truncate">
                {manifest.label}
              </LocaleString>
              {" - "}
            </>
          ) : null}
          <LocaleString>{canvas.label}</LocaleString>
        </div>
        <span className="text-blue-500 truncate text-xs">{item.id}</span>
      </div>
    </div>
  );
}

function RenderSelectedListOfType() {
  return <div />;
}

function RenderSelectedListOfManyTypes({ items }: { items: SelectedItem[] }) {
  if (items.length === 0) {
    return <div />;
  }

  return (
    <div className="flex items-center gap-3">
      <MultiImageIcon className="text-2xl text-[#C63E75]" />
      <span>{items.length} items selected</span>
    </div>
  );
}
