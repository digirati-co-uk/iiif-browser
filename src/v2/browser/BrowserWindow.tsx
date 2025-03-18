export function BrowserWindow(props: { children: React.ReactNode }) {
  return (
    <div className="flex-1 relative overflow-auto flex flex-col [&>*]:flex-1">
      {props.children}
    </div>
  );
}
