import { Button, type ButtonProps } from "react-aria-components";

export function BrowserToolbarButton({
  children,
  ...props
}: Omit<ButtonProps, "className">) {
  return (
    <Button
      className="flex-shrink-0 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white aria-expanded:bg-slate-200 outline-none focus:ring ring-blue-300 text-2xl rounded hover:bg-slate-100 p-1.5 m-1"
      {...props}
    >
      {children}
    </Button>
  );
}
