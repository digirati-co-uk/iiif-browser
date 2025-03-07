import { IIIFBrowser } from "./IIIFBrowser";

export default {
  title: "IIIF Browser v2",
  component: IIIFBrowser,
};

export const Default = () => (
  <>
    <div className="max-w-2xl">
      <IIIFBrowser />
    </div>
    <div className="flex">
      <div id="iiif-browser__debug-history" />
    </div>
  </>
);
