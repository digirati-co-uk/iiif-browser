import Homepage from "./routes/Homepage";
import "./index.css";
import { BrowserProvider } from "./context";

export function IIIFBrowser() {
  return (
    <BrowserProvider>
      <Homepage />
    </BrowserProvider>
  );
}
