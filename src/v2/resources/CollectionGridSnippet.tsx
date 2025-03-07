import { usePress } from "react-aria";
import { Button } from "react-aria-components";
import { LocaleString, useCollection } from "react-iiif-vault";
import { FolderIcon } from "../../components/FolderIcon";
import { useResolve } from "../context";

export function CollectionGridSnippet({ id }: { id: string }) {
  const collection = useCollection({ id });
  const open = useResolve();
  const { pressProps } = usePress({
    onPress: () => {
      open(collection!.id);
    },
  });

  if (!collection) return null;

  return (
    <div
      className="rounded-md cursor-pointer hover:bg-slate-200 p-1 group mb-4"
      {...pressProps}
    >
      <div className="mb-2 overflow-hidden rounded aspect-square bg-slate-50 group-hover:bg-slate-100">
        <FolderIcon />
      </div>
      <div className="text-center overflow-hidden text-xs line-clamp-2">
        <LocaleString>{collection.label}</LocaleString>
      </div>
    </div>
  );
}
