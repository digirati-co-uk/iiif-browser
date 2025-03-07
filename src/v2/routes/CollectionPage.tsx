import { useEffect, useMemo } from "react";
import { useVault, useCollection } from "react-iiif-vault";
import { useSearchParams } from "react-router-dom";
import { useHistory } from "../context";
import { CollectionItemList } from "../resources/CollectionItemList";

export function CollectionPage() {
  const vault = useVault();
  const [searchParams] = useSearchParams();
  const history = useHistory();
  const collectionId = searchParams.get("id") as string;
  const viewSource = searchParams.get("view-source") === "true";
  const collection = useCollection({ id: collectionId });

  useEffect(() => {
    if (!collection) {
      history.replace(
        `/loading?id=${encodeURIComponent(collectionId)}&view-source=${viewSource}`,
      );
    }
  }, [collection]);

  const source = useMemo(() => {
    if (!viewSource || !collection) return null;
    return vault.toPresentation3(collection as any);
  }, [vault, collection, viewSource]);

  if (viewSource) {
    return (
      <pre className="p-4 m-4 border bg-gray-50 border-gray-100 overflow-scroll rounded-lg text-xs">
        {JSON.stringify(source, null, 2)}
      </pre>
    );
  }

  return <CollectionItemList id={collectionId} />;
}
