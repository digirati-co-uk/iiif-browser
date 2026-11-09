import { useBrowserI18n } from "../i18n";
export function BrowserWindow(props: { children: React.ReactNode }) {
 const { t } = useBrowserI18n();
  return (
    <div
      id="browser-container"
      className="flex-1 relative overflow-auto flex flex-col [&>*]:flex-1 focus:outline-none focus-visible:ring"
      aria-label={t("iiifBrowserWindow", "IIIF Browser window")}
    >
      {props.children}
    </div>
  );
}
