const paths = {
  sidebar: "M3 4h18v16H3zM9 4v16",
  bold: "M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z",
  italic: "M10 4h9M5 20h9M15 4 9 20",
  heading: "M5 4v16M17 4v16M5 12h12",
  list: "M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01",
  checklist: "m2 6 2 2 3-4M10 6h11m-11 6h11m-11 6h11M3 12h3v3H3z",
  left: "M4 5h16M4 10h10M4 15h16M4 20h10",
  center: "M4 5h16M7 10h10M4 15h16M7 20h10",
  right: "M4 5h16M10 10h10M4 15h16M10 20h10",
  image: "M3 4h18v16H3zM3 16l5-5 5 5 3-3 5 5M15 8h.01",
  viewer: "M3 4h18v16H3zM3 8h18M8 8v12",
  collection: "M4 8h16v13H4zM7 5h10M9 2h6",
  undo: "m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14",
  redo: "m16 4 5 5-5 5m5-5h-10a7 7 0 0 0 0 14",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};
export function NotebookIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
