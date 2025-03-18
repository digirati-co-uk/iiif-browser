export function BrowserWindow(props: { children: React.ReactNode }) {
  return (
    <div className="h-[600px] flex-1 relative overflow-auto">
      {props.children}
    </div>
  );
}
