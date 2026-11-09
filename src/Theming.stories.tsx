import "./styles/lib.css";
import "./index.css";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { type CSSProperties, useMemo, useState } from "react";
import { IIIFBrowser } from "./IIIFBrowser";
import { createInteractionFixture } from "./fixtures/interaction-regression";
import { IIIFNotebook, createNotebook } from "./notebook";
import { initialNotes } from "./notebook/story-fixtures";
import { contrastRatio, toHex } from "./theme/colors";
import {
  createThemeAttributes,
  resolveAccent,
  type ThemeMode,
  type ThemePreference,
} from "./theme/theme";

export default {
  title: "Theming",
  parameters: { layout: "fullscreen" },
};

const shell: CSSProperties = { height: "100vh", display: "flex", padding: 16 };

function Browser({
  start = "collection",
  ...props
}: Partial<React.ComponentProps<typeof IIIFBrowser>> & {
  start?: "collection" | "manifest";
}) {
  const fixture = useMemo(() => createInteractionFixture({}), []);
  const url =
    start === "collection" ? fixture.collectionId : fixture.manifestId;
  const route =
    start === "collection"
      ? `/collection?id=${encodeURIComponent(url)}`
      : `/manifest?id=${encodeURIComponent(url)}&canvas=${encodeURIComponent(fixture.canvasId)}`;
  return (
    <div style={shell}>
      <IIIFBrowser
        vault={fixture.vault}
        navigation={{ canSelectManifest: true, canSelectCollection: false }}
        history={{
          restoreFromLocalStorage: false,
          saveToLocalStorage: false,
          initialHistory: [{ url, resource: null, route }],
        }}
        {...props}
      />
    </div>
  );
}

const THEME_KEY = "iiif-browser:theme:v1:theming-stories";

/** Start each story from a known viewer preference. */
function resetStoredTheme() {
  try {
    window.localStorage.removeItem(THEME_KEY);
  } catch {
    /* storage unavailable */
  }
}

export const LightDefault = {
  name: "Browser / Light (default)",
  render: () => <Browser start="manifest" theme="light" />,
};

export const Dark = {
  name: "Browser / Dark (from props)",
  render: () => <Browser start="collection" theme="dark" />,
};

export const DarkManifest = {
  name: "Browser / Dark, manifest view",
  render: () => <Browser start="manifest" theme="dark" />,
};

export const FollowSystem = {
  name: "Browser / Follow system preference",
  render: () => <Browser theme="system" />,
  parameters: {
    docs: {
      description: {
        story:
          '`theme="system"` follows `prefers-color-scheme` and updates live when the OS setting changes.',
      },
    },
  },
};

export const MenuToggle = {
  name: "Browser / Dark mode toggle in the menu",
  render: () => {
    resetStoredTheme();
    return <Browser preferenceKey="theming-stories" />;
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const root = () =>
      canvasElement.querySelector<HTMLElement>(".iiif-browser-root")!;
    const canvas = within(canvasElement);
    expect(root().dataset.ibTheme).toBe("light");

    await userEvent.click(await canvas.findByRole("button", { name: "Menu" }));
    // The menu is portalled to <body>, outside the story canvas.
    await userEvent.click(
      await within(document.body).findByRole("menuitem", {
        name: "Switch to dark mode",
      }),
    );
    await waitFor(() => expect(root().dataset.ibTheme).toBe("dark"));
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");

    await userEvent.click(await canvas.findByRole("button", { name: "Menu" }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", {
        name: "Switch to light mode",
      }),
    );
    await waitFor(() => expect(root().dataset.ibTheme).toBe("light"));
    resetStoredTheme();
  },
};

export const HostControlled = {
  name: "Browser / Host controlled theme",
  render: function HostControlled() {
    const [theme, setTheme] = useState<ThemePreference>("dark");
    return (
      <div>
        <div
          style={{ padding: 16, display: "flex", gap: 8, alignItems: "center" }}
        >
          <span>Host theme:</span>
          {(["light", "dark", "system"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={theme === option}
              onClick={() => setTheme(option)}
              style={{ fontWeight: theme === option ? 700 : 400 }}
            >
              {option}
            </button>
          ))}
          <span>(the menu toggle also reports back through onThemeChange)</span>
        </div>
        <Browser theme={theme} onThemeChange={setTheme} />
      </div>
    );
  },
};

export const ToggleHidden = {
  name: "Browser / Menu toggle disabled",
  render: () => <Browser ui={{ themeToggle: false }} />,
};

export const CustomAccentTeal = {
  name: "Browser / Custom accent (teal, light)",
  render: () => (
    <Browser start="manifest" theme="light" accentColor="#0d9488" />
  ),
};

export const CustomAccentTealDark = {
  name: "Browser / Custom accent (teal, dark)",
  render: () => <Browser start="manifest" theme="dark" accentColor="#0d9488" />,
};

export const PaleAccentDarkLabel = {
  name: "Browser / Pale accent gets a dark label",
  render: () => <Browser start="manifest" theme="dark" accentColor="#ffd075" />,
  parameters: {
    docs: {
      description: {
        story:
          "White text on `#ffd075` fails WCAG AA, so filled accents switch to black text automatically.",
      },
    },
  },
};

const SWATCHES = [
  ["Default blue", "#2563eb"],
  ["Theseus green", "#4c9c53"],
  ["Teal", "#0d9488"],
  ["Violet", "#8b5cf6"],
  ["Red", "#e50015"],
  ["Amber", "#ffd075"],
  ["Navy", "#0b2a6f"],
  ["Near white", "#f5f5f5"],
] as const;

function Swatch({
  name,
  accent,
  mode,
}: {
  name: string;
  accent: string;
  mode: ThemeMode;
}) {
  const attributes = createThemeAttributes(mode, accent);
  const { fill, text } = resolveAccent(mode, accent);
  return (
    <div
      {...attributes}
      className="iiif-browser"
      style={{
        ...attributes.style,
        background: "rgb(var(--ib-white, 255 255 255))",
        padding: 12,
        borderRadius: 8,
        border: "1px solid rgb(var(--ib-gray-300, 209 213 219))",
      }}
    >
      <p className="text-sm font-semibold text-gray-800">{name}</p>
      <p className="text-xs text-gray-500">
        {accent} · label {toHex(text)} · {contrastRatio(text, fill).toFixed(1)}
        :1
      </p>
      <button
        type="button"
        className="bg-accent hover:bg-accent-hover text-accent-text py-2 px-4 rounded mt-2"
      >
        Select item
      </button>
      <a href="#swatch" className="block mt-2 text-sm text-blue-600 underline">
        Accent link text
      </a>
    </div>
  );
}

export const AccentContrast = {
  name: "Accent colours / Button label contrast",
  render: () => (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      {(["light", "dark"] as const).map((mode) => (
        <section key={mode}>
          <h2 style={{ margin: "0 0 8px", color: "inherit" }}>{mode}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: 12,
            }}
          >
            {SWATCHES.map(([name, accent]) => (
              <Swatch key={name} name={name} accent={accent} mode={mode} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Each configured accent is checked: the fill keeps 3:1 against the surface and its label is chosen for at least 4.5:1 (WCAG AA).",
      },
    },
  },
};

function Notebook(props: Partial<React.ComponentProps<typeof IIIFNotebook>>) {
  const [notebook] = useState(() =>
    createNotebook({ storageKey: false, initialNotes: initialNotes() }),
  );
  return (
    <IIIFNotebook
      notebook={notebook}
      projectId="delft-exhibition"
      height="100vh"
      {...props}
    />
  );
}

export const NotebookLight = {
  name: "Notebook / Light",
  render: () => <Notebook theme="light" />,
};

export const NotebookDark = {
  name: "Notebook / Dark",
  render: () => <Notebook theme="dark" />,
};

export const NotebookDarkAccent = {
  name: "Notebook / Dark with custom accent",
  render: () => <Notebook theme="dark" accentColor="#e0457b" />,
};

export const NotebookHostControlled = {
  name: "Notebook / Host controlled theme",
  render: function NotebookHostControlled() {
    const [theme, setTheme] = useState<ThemePreference>("dark");
    return (
      <div>
        <div style={{ padding: 8 }}>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            Switch to {theme === "dark" ? "light" : "dark"}
          </button>
        </div>
        <Notebook theme={theme} height="90vh" />
      </div>
    );
  },
};
