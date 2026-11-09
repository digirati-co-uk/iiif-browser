import { createContext, useContext, type ReactNode } from "react";

/** UI language only. IIIF content labels and caller-supplied text are never translated. */
export interface BrowserI18n {
  locale?: string;
  direction?: "ltr" | "rtl";
  translate?: (key: string, defaultValue: string, values?: Record<string, string | number>) => string;
  formatRelativeTime?: (value: number, unit: string, suffix: string, epochMilliseconds: number) => string;
}
export type BrowserTranslate = NonNullable<BrowserI18n["translate"]>;
const BrowserI18nContext = createContext<BrowserI18n | undefined>(undefined);
const english: BrowserTranslate = (_key, fallback, values) =>
  fallback.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values?.[name] ?? ""));

export function BrowserI18nProvider({ i18n, children }: { i18n?: BrowserI18n; children?: ReactNode }) {
  const inherited = useContext(BrowserI18nContext);
  return <BrowserI18nContext.Provider value={i18n ?? inherited}>{children}</BrowserI18nContext.Provider>;
}
export function useBrowserI18n() {
  const i18n = useContext(BrowserI18nContext);
  return { locale: i18n?.locale, direction: i18n?.direction, t: i18n?.translate ?? english, formatRelativeTime: i18n?.formatRelativeTime };
}
export interface BrowserMessageLabel {
  label: string;
  labelMessage?: string;
  labelValues?: Record<string, string | number>;
}
export function displayBrowserLabel(item: BrowserMessageLabel, t: BrowserTranslate) {
  return item.labelMessage ? t(item.labelMessage, item.label, item.labelValues) : item.label;
}
export function BrowserDiagnostic({ error }: { error: unknown }) {
  const { t } = useBrowserI18n();
  return <div>{t("actionFailed", "Action failed. Try again.")}<details><summary>{t("technicalDetails", "Technical details")}</summary><pre>{String(error)}</pre></details></div>;
}
