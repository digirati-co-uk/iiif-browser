import { Component, type ReactNode } from "react";
import { useResolve, useUIConfig } from "../context";

// ─── Sad Mac pixel art (12×8, upscaled via CSS) ──────────────────────────────
const SAD_MAC_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAICAYAAAAvOAWIAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAC6ADAAQAAAABAAAACAAAAADGHiDWAAAAO0lEQVQYGWP4DwQMQACjQWxkABOH0TgVwjRhKIQLwFRAaZg4jEaTphKXEWYOPmsYgQCmjnQPwnXiYQAAP/M3zvinPKAAAAAASUVORK5CYII=";

function ErrorFallback({
  error,
  onDismiss,
}: {
  error: unknown;
  onDismiss: (navigateTo?: string) => void;
}) {
  const { homeLink } = useUIConfig();
  const resolve = useResolve();

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center bg-gray-50">
      <img
        src={SAD_MAC_SRC}
        alt="Error"
        style={{
          border: "3px solid white",
          padding: 15,
          imageRendering: "pixelated",
          width: 132,
          height: 96,
          opacity: 0.6,
          background: "#e5e7eb",
        }}
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-gray-600">
          Something went wrong
        </p>
        <p className="text-xs text-gray-400 max-w-xs break-words">{message}</p>
      </div>
      <div className="flex gap-2">
        {homeLink && (
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => {
              resolve(homeLink);
              onDismiss();
            }}
          >
            Go home
          </button>
        )}
        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => onDismiss()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Class boundary ───────────────────────────────────────────────────────────

interface State {
  error: unknown;
}

class WindowErrorBoundaryInner extends Component<
  { children: ReactNode },
  State
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  dismiss = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error !== null) {
      return (
        <ErrorFallback error={this.state.error} onDismiss={this.dismiss} />
      );
    }
    return this.props.children;
  }
}

// ─── Public wrapper ───────────────────────────────────────────────────────────

export function WindowErrorBoundary({ children }: { children: ReactNode }) {
  return <WindowErrorBoundaryInner>{children}</WindowErrorBoundaryInner>;
}
