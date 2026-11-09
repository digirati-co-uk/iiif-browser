import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createThemeAttributes,
  isThemePreference,
  resolveThemeMode,
  type ThemeMode,
  type ThemePreference,
} from "./theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}

export function useSystemPrefersDark() {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(DARK_QUERY).matches
        : false,
    () => false,
  );
}

export interface BrowserThemeValue {
  /** The preference: `light`, `dark` or `system`. */
  preference: ThemePreference;
  /** The theme actually in use after resolving `system`. */
  mode: ThemeMode;
  accentColor?: string;
  setPreference(preference: ThemePreference): void;
  toggle(): void;
  /** Whether the viewer may change the theme themselves (e.g. the menu toggle). */
  canToggle: boolean;
}

const ThemeContext = createContext<BrowserThemeValue | null>(null);

/** The surrounding theme, or null when rendered outside a themed browser/notebook. */
export function useOptionalTheme() {
  return useContext(ThemeContext);
}

export function useBrowserTheme(): BrowserThemeValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      preference: "light",
      mode: "light",
      setPreference() {},
      toggle() {},
      canToggle: false,
    };
  }
  return context;
}

/**
 * `data-ib-theme` and CSS variables for elements that render outside the themed root, such as
 * modals that portal to `document.body`.
 */
export function useThemeAttributes() {
  const { mode, accentColor } = useBrowserTheme();
  return useMemo(
    () => createThemeAttributes(mode, accentColor),
    [mode, accentColor],
  );
}

function storageKey(scope: string) {
  return `iiif-browser:theme:v1:${scope}`;
}

function readStored(scope: string): ThemePreference | undefined {
  try {
    const value = window.localStorage.getItem(storageKey(scope));
    return isThemePreference(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export interface ThemeProviderProps {
  /**
   * Set the theme from the host. When provided without `onThemeChange` the viewer cannot change it;
   * with `onThemeChange` it is controlled and the in-app toggle calls back to the host.
   * Leave unset to start light and let viewers toggle (their choice is remembered).
   */
  theme?: ThemePreference;
  onThemeChange?(theme: ThemePreference): void;
  /** Accent colour for buttons, links and selection: hex, `rgb()`, or `r g b`. */
  accentColor?: string;
  /** Show/allow the in-app toggle when the theme is not set from props. Default true. */
  allowToggle?: boolean;
  /** Where the viewer's choice is remembered. */
  preferenceKey?: string;
  /** Don't persist the viewer's choice. */
  persist?: boolean;
  children: ReactNode;
}

export function ThemeProvider({
  theme,
  onThemeChange,
  accentColor,
  allowToggle = true,
  preferenceKey = "default",
  persist = true,
  children,
}: ThemeProviderProps) {
  const parent = useContext(ThemeContext);
  const systemDark = useSystemPrefersDark();
  const [local, setLocal] = useState<ThemePreference>(
    () =>
      (persist && typeof window !== "undefined"
        ? readStored(preferenceKey)
        : undefined) ?? "light",
  );

  // A nested browser (e.g. the picker inside a notebook dialog) follows the one around it.
  const inherited = theme === undefined && parent !== null;
  const controlled = theme !== undefined;
  const preference: ThemePreference = controlled
    ? theme
    : inherited
      ? parent.preference
      : local;
  const mode = inherited
    ? parent.mode
    : resolveThemeMode(preference, systemDark);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      if (controlled) {
        onThemeChange?.(next);
        return;
      }
      setLocal(next);
      onThemeChange?.(next);
      if (!persist) return;
      try {
        window.localStorage.setItem(storageKey(preferenceKey), next);
      } catch {
        /* Keep the session preference when storage is unavailable. */
      }
    },
    [controlled, onThemeChange, persist, preferenceKey],
  );

  const toggle = useCallback(
    () => setPreference(mode === "dark" ? "light" : "dark"),
    [mode, setPreference],
  );

  const canToggle = inherited
    ? false
    : controlled
      ? Boolean(onThemeChange)
      : allowToggle;
  const effectiveAccent =
    accentColor ?? (inherited ? parent.accentColor : undefined);

  const value = useMemo<BrowserThemeValue>(
    () => ({
      preference,
      mode,
      accentColor: effectiveAccent,
      setPreference,
      toggle,
      canToggle,
    }),
    [preference, mode, effectiveAccent, setPreference, toggle, canToggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
