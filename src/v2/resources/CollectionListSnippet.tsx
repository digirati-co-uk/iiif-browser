import { useCollection } from "react-iiif-vault";
import { ResourceListItem } from "./ResourceListItem";

export function CollectionListSnippet({ id }: { id: string }) {
  const collection = useCollection({ id });

  if (!collection) return null;

  return <ResourceListItem resource={collection} />;
}
