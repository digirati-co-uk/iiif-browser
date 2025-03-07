export function BrowserWindow(props: { children: React.ReactNode }) {
  return (
    <div className="h-[600px] relative overflow-auto">{props.children}</div>
  );
}
