import { Link } from "react-aria-components";

export function SkipToContent() {
  return (
    <a
      href="#browser-container"
      target="_self"
      className="sr-only focus-visible:not-sr-only focus-visible:outline rounded-sm focus-visible:p-2 text-sm focus-visible:absolute z-20 left-3 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      Skip to main content
    </a>
  );
}
