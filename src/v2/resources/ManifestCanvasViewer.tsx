import { useEffect } from "react";
import {
  CanvasPanel,
  SequenceThumbnails,
  useManifest,
  useSimpleViewer,
} from "react-iiif-vault";
import { useNavigate } from "react-router-dom";

export function ManifestCanvasViewer() {
  const manifest = useManifest()!;
  const { sequence, items, currentSequenceIndex } = useSimpleViewer();
  const navigate = useNavigate();

  useEffect(() => {
    const current = sequence[currentSequenceIndex];
    const canvas = items[current[0]];
    if (canvas) {
      navigate(
        {
          search: `?id=${encodeURIComponent(manifest.id)}&canvas=${canvas.id}`,
        },
        { replace: true },
      );
    }
  }, [currentSequenceIndex, manifest, sequence, navigate, items]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex w-full flex-1 min-h-0">
        <CanvasPanel.Viewer height={"auto"}>
          <CanvasPanel.RenderCanvas />
        </CanvasPanel.Viewer>
      </div>
      <div className="flex-shrink-0 h-32 items-center flex">
        <SequenceThumbnails
          classes={{
            container: "flex gap-1 overflow-x-auto items-center px-[50%]",
            row: "flex gap-2 border border-gray-200 flex-none h-24 w-24 items-center justify-center rounded overflow-hidden p-1",
            img: "max-h-24 max-w-24 object-contain h-full w-full",
            selected: {
              row: "flex gap-2 border border-blue-400 flex-none bg-blue-100 h-24 w-24 items-center justify-center rounded overflow-hidden p-1",
            },
          }}
        />
      </div>
    </div>
  );
}
