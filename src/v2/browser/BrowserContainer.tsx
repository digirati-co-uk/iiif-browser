import { createContext, useContext, useState } from "react";
import { twMerge } from "tailwind-merge";

const BrowserContainerContext = createContext<HTMLDivElement | null>(null);

export function useBrowserContainer() {
  return useContext(BrowserContainerContext);
}

export const BrowserContainer = function BrowserContainer(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  return (
    <BrowserContainerContext.Provider value={ref}>
      <div
        className={twMerge(
          "bg-white flex-1 flex flex-col min-h-[400px] min-w-[350px] relative border rounded-lg border-slate-200 overflow-hidden",
          props.className,
        )}
        ref={setRef}
      >
        {props.children}
      </div>
    </BrowserContainerContext.Provider>
  );
};
