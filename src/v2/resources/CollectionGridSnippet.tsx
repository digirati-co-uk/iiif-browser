import { useCollection } from "react-iiif-vault";
import { FolderIcon } from "../../components/FolderIcon";
import { ResourceGridItem } from "./ResourceGridItem";

export function CollectionGridSnippet({ id }: { id: string }) {
  const collection = useCollection({ id });

  if (!collection) return null;

  return <ResourceGridItem resource={collection} thumbnail={<FolderIcon />} />;
}
