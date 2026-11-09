import { useBrowserI18n } from "../i18n";
export default function AboutPage() {
  const { t } = useBrowserI18n();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t("about", "About")}</h1>
      <p className="mb-4">
        The IIIF Browser is a web application that allows users to browse and
        search IIIF content. It is built by Digirati using React and TypeScript.
      </p>
      <div className="flex gap-3 text-blue-500 underline">
        <a
          href="https://github.com/digirati-co-uk/iiif-browser"
          target="_blank"
          rel="noreferrer"
        >
          {t("viewOnGitHub", "View on GitHub")}
        </a>
        <a href="https://digirati.com" target="_blank" rel="noreferrer">
          Digirati
        </a>
      </div>
    </div>
  );
}
