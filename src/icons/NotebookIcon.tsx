import type { SVGProps } from "react";

export function NotebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="5" y="3" width="15" height="18" rx="2" />
      <path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h5M12 16h3" />
    </svg>
  );
}
