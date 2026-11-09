import { useBrowserI18n } from "../i18n";
import { useLoadingPage } from "../context";

export function LoadingPage() {
 const { t } = useBrowserI18n();
  useLoadingPage();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold">{t("loading", "Loading...")}</h1>
      <p className="text-lg">{t("pleaseWaitWhileWeLoadTheData", "Please wait while we load the data.")}</p>
    </div>
  );
}
