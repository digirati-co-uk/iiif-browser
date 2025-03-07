import type {
  OutputFormat,
  OutputTarget,
  OutputType,
} from "../../IIIFBrowser.types";
import { BrowserOutput } from "../components/BrowserOutput";
import { BrowserOutputActions } from "./BrowserOuputActions";
import { BrowserOutputPreview } from "./BrowserOutputPreview";

interface BrowserFooterProps {
  /**
   * Resource types valid for output. (e.g. Manifest, Canvas)
   */
  types: OutputType[];
  /**
   * Targets of the output. (e.g. clipboard, input)
   *   - first is default.
   */
  targets: OutputTarget[];
  format: OutputFormat;
  output?: { id: string; type: string };
  onSelect?: () => void;
}

export function BrowserFooter({
  types,
  targets,
  format,
  output,
  onSelect,
}: BrowserFooterProps) {
  return (
    <div className="p-3 border-t bg-gray-100 flex gap-2 justify-between">
      <BrowserOutputPreview />
      <BrowserOutputActions />
    </div>
  );
}
