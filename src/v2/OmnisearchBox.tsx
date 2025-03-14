import { useCallback, useMemo, useRef } from "react";
import type { IIIFBrowserProps } from "./IIIFBrowser";
import { OmnisearchModal } from "./components/OmnisearchModal";
import { BrowserProvider, useLastUrl, useSearchBoxState } from "./context";
import type { SearchIndexItem } from "./stores/omnisearch-store";

const uiConfigDefault: IIIFBrowserProps["ui"] = {
  defaultPages: {
    about: false,
    bookmarks: false,
    history: false,
    viewSource: false,
    homepage: false,
  },
};

export function IIIFBrowserOmnisearch({
  history,
  navigation,
  output,
  debug,
  className,
  children,
  onSelect,
}: Omit<IIIFBrowserProps, "ui"> & {
  className?: string;
  children: (ctx: RenderFunctionModalContext) => React.ReactNode;
  onSelect: (item: SearchIndexItem) => void;
}) {
  const wasLastOpenRef = useRef(false);

  return (
    <BrowserProvider
      uiConfig={uiConfigDefault}
      outputConfig={output}
      browserConfig={history}
      linkConfig={navigation}
      debug={debug}
    >
      <OmnisearchModal
        className={className}
        wasLastOpenRef={wasLastOpenRef}
        onSelect={onSelect}
      >
        <RenderFunctionModal wasLastOpenRef={wasLastOpenRef}>
          {children}
        </RenderFunctionModal>
      </OmnisearchModal>
    </BrowserProvider>
  );
}

type RenderFunctionModalContext = {
  openModal: (query: string) => void;
  closeModal: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  wasLastOpenRef: React.MutableRefObject<boolean>;
  lastUrl: string;
};

function RenderFunctionModal({
  wasLastOpenRef,
  children,
}: {
  wasLastOpenRef: React.MutableRefObject<boolean>;
  children: (ctx: RenderFunctionModalContext) => React.ReactNode;
}) {
  const lastUrl = useLastUrl();
  const {
    isOpen: isModalOpen,
    open: openModal,
    close: closeModal,
  } = useSearchBoxState();
  const setIsModalOpen = useCallback(
    (open: boolean) => {
      if (open) {
        openModal(lastUrl);
      } else {
        closeModal();
        wasLastOpenRef.current = true;
      }
    },
    [lastUrl, openModal, closeModal, wasLastOpenRef],
  );

  return (
    <>
      {children({
        openModal,
        closeModal,
        isModalOpen,
        setIsModalOpen,
        wasLastOpenRef,
        lastUrl,
      })}
    </>
  );
}
