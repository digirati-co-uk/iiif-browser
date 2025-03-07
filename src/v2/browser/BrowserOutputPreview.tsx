import { LocaleString, useCollection, useManifest } from "react-iiif-vault";
import { useSelectedItems } from "../context";
import { PortalResourceIcon } from "../icons/PortalResourceIcon";

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
      return <RenderSelectedCanvas />;
    }
    return <div />;
  }

  // Option 2. Multiple resources of the same type
  // Option 3. Multiple resources of different types

  return <div />;
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

function RenderSelectedCanvas() {
  return <div />;
}

function RenderSelectedListOfType() {
  return <div />;
}

function RenderSelectedListOfManyTypes() {
  return <div />;
}
