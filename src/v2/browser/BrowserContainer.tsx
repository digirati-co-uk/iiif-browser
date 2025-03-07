import { createContext, useContext, useState } from "react";

const BrowserContainerContext = createContext<HTMLDivElement | null>(null);

export function useBrowserContainer() {
  return useContext(BrowserContainerContext);
}

export const BrowserContainer = function BrowserContainer(props: {
  children: React.ReactNode;
}) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  return (
    <BrowserContainerContext.Provider value={ref}>
      <div
        className="bg-white flex-1 relative border rounded-lg shadow-2xl mb-8 border-slate-200 overflow-hidden"
        ref={setRef}
      >
        {props.children}
      </div>
    </BrowserContainerContext.Provider>
  );
};
