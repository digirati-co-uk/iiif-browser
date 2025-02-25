import { createRoot } from "react-dom/client";
import * as Stories from "../IIIFBrowser.stories";

const root = createRoot(document.getElementById("root")!);

root.render(<Stories.ScottishBridges />);
