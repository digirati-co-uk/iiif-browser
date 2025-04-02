export function BrowserWindow(props: { children: React.ReactNode }) {
  return (
    <div
      id="browser-container"
      className="flex-1 relative overflow-auto flex flex-col [&>*]:flex-1 focus:outline-none focus-visible:ring"
      aria-label="IIIF Browser window"
    >
      {props.children}
    </div>
  );
}
