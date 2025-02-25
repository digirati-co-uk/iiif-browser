import { Command } from "cmdk";
import { useSearchParams } from "react-router-dom";

export function OpenInTheseus() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  if (!id || !id.startsWith("https://")) return null;

  // https://view.nls.uk/collections/1166/7613/116676134.json
  return (
    <Command.Item
      className="flex items-center data-[selected=true]:bg-slate-100"
      keywords={["Open in Theseus", "Viewer", "IIIF"]}
      onSelect={() =>
        window.open(`https://theseusviewer.org/?iiif-content=${id}`, "_blank")
      }
    >
      Open in Theseus
    </Command.Item>
  );
}
