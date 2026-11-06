import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered instead of the children after they throw while rendering. */
  fallback: ReactNode | ((error: unknown) => ReactNode);
  /** Changing this value clears a previous failure and tries the children again. */
  resetKey?: unknown;
  onError?(error: unknown): void;
}

/**
 * Isolates a failing part of the notebook. Resource data can come from imported
 * notes or remote servers, so one bad link must never unmount the editor.
 */
export class NotebookErrorBoundary extends Component<
  Props,
  { error: unknown; failed: boolean }
> {
  state = { error: null as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey)
      this.setState({ error: null, failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === "function"
      ? fallback(this.state.error)
      : fallback;
  }
}
