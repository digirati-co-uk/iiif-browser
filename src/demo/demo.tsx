import { createRoot } from "react-dom/client";
import { IIIFBrowser } from "../bundle";

const root = createRoot(document.getElementById("root")!);

root.render(
  <div style={{ width: "100%", height: "80vh" }}>
    <IIIFBrowser debug />
  </div>,
);
