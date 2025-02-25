import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  ComboBox,
  Dialog,
  DialogTrigger,
  Input,
  type Key,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import {
  useGetSearchResult,
  useIsPageLoading,
  useLastUrl,
  useResolve,
  useSearchResults,
  useSearchState,
} from "../context";
import { SearchIcon } from "../routes/Homepage";

export function OmnisearchBox({ container }: { container: Element }) {
  const [search, setSearch] = useSearchState();
  const lastUrl = useLastUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useSearchResults();
  const getSearchResult = useGetSearchResult();
  const open = useResolve();
  const wasLastOpen = useRef(false);
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const loading = useIsPageLoading();
  const lastUrlWithoutHttps = useMemo(() => {
    return lastUrl.replace(/^https?:\/\//, "");
  }, [lastUrl]);
  const valueToShow = useMemo(() => {
    if (loading) {
      return search.replace(/^https?:\/\//, "");
    }
    return lastUrlWithoutHttps;
  }, [loading, search, lastUrlWithoutHttps]);

  const setIsModalOpen = (open: boolean) => {
    _setIsModalOpen(open);
    if (!open) {
      wasLastOpen.current = true;
    }
  };

  const onSelectionChange = useCallback(
    (key: Key | null) => {
      if (key) {
        const result = getSearchResult(key as string);
        if (result) {
          if (result.type === "resource") {
            open(result.resource.id);
          }
          if (result.type === "action") {
            result.action();
          }
          if (result.type === "page") {
            open(result.url);
          }
          setIsModalOpen(false);
          setSearch(key as string);
        }
      }
    },
    [open],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsModalOpen(!isModalOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isModalOpen]);

  const onBlur = useCallback(() => {
    if (!isModalOpen) {
      wasLastOpen.current = false;
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      setSearch(lastUrl);
    } else {
      wasLastOpen.current = true;
    }
  }, [isModalOpen, lastUrl]);

  useEffect(() => {
    if (isModalOpen) {
      // I hate this hack, but it's the only way to focus the input after the modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  console.log(results);

  return (
    <DialogTrigger isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
      <div>
        <Label className="sr-only">Search</Label>
        <Button
          onBlur={onBlur}
          onFocus={() => {
            if (!wasLastOpen.current) {
              setIsModalOpen(true);
            }
          }}
          className="p-1 text-sm focus:outline-none text-slate-600 z-10 w-full text-left"
        >
          <span className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis block truncate">
            {valueToShow}
          </span>
        </Button>
      </div>
      <Popover
        className="bg-white inset-0"
        UNSTABLE_portalContainer={container}
        shouldUpdatePosition={false}
      >
        <Dialog className="focus:outline-none">
          <ComboBox onSelectionChange={onSelectionChange} menuTrigger="focus">
            <div className="flex h-14 border-b shadow bg-gray-50">
              <div className="w-11 ml-0.5 text-xl flex items-center justify-center text-slate-500">
                <SearchIcon />
              </div>
              <div className="relative flex-1 translate-y-[-1px] translate-x-[-1px] text-sm">
                {/* This is the autocomplete suggestion
                <div className="absolute p-1 inset-0 text-slate-300 z-10 flex items-center pr-3">
                  https://view.nls.uk/collections/7446/74466699.json
                </div> */}
                <Input
                  ref={inputRef}
                  key={location.pathname + location.search}
                  className="p-1 relative flex-1 w-full h-full bg-transparent z-20 text-slate-600 focus:outline-none"
                  value={search}
                  onKeyDown={(e) => {
                    // Close on esc
                    if (e.key === "Escape") {
                      setIsModalOpen(false);
                      wasLastOpen.current = true;
                    }
                    if (
                      e.key === "Enter" &&
                      (search.startsWith("https://") ||
                        search.startsWith("iiif://"))
                    ) {
                      open(search);
                      setIsModalOpen(false);
                      wasLastOpen.current = true;
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <ListBox selectionMode="single" items={results || undefined}>
              {({ id }) => {
                const item = getSearchResult(id);
                return (
                  <ListBoxItem
                    className={({ isFocused }) => (isFocused ? "bg-[red]" : "")}
                  >
                    {item?.label}
                  </ListBoxItem>
                );
              }}
            </ListBox>
          </ComboBox>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
