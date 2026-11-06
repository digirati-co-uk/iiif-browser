import { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import {
  useAvailableOutputs,
  useSelectedActions,
  useUIConfig,
} from "../context";
import type { OutputTarget } from "../stores/output-store";

export function BrowserOutputActions() {
  const availableOutputs = useAvailableOutputs();
  const { runTargetAction } = useSelectedActions();
  const { buttonClassName } = useUIConfig();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [first, ...others] = availableOutputs;
  if (!first)
    return (
      <div className="px-4 text-sm opacity-40 whitespace-nowrap">
        No actions available
      </div>
    );
  const run = async (output: OutputTarget) => {
    setBusy(true);
    setError("");
    try {
      await runTargetAction(output);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Action failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const className = twMerge(
    "bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50",
    first.buttonClassName || buttonClassName,
  );
  return (
    <div
      aria-label="Output actions"
      className="flex-shrink-0 flex gap-1 items-center whitespace-nowrap"
    >
      {error && (
        <span
          role="alert"
          className="text-xs text-red-700 max-w-52 whitespace-normal"
        >
          {error}
        </span>
      )}
      <Button
        aria-label={first.label}
        className={className}
        isDisabled={busy}
        onPress={() => {
          void run(first);
        }}
      >
        {busy ? "Working…" : first.label}
      </Button>
      {!!others.length && (
        <MenuTrigger>
          <Button
            aria-label="More actions"
            className={twMerge(className, "px-2")}
            isDisabled={busy}
          >
            ▾
          </Button>
          <Popover
            placement="top end"
            className="iiif-browser rounded border border-gray-200 bg-white shadow-lg p-1"
            style={{ zIndex: 1000011 }}
          >
            <Menu
              aria-label="More actions"
              className="outline-none"
              onAction={(key) => {
                void run(others[Number(key)]);
              }}
            >
              {others.map((output, index) => (
                <MenuItem
                  key={index}
                  id={index}
                  className="text-sm px-3 py-2 rounded cursor-pointer outline-none hover:bg-blue-50 focus:bg-blue-50 text-slate-700"
                >
                  {output.label}
                </MenuItem>
              ))}
            </Menu>
          </Popover>
        </MenuTrigger>
      )}
    </div>
  );
}
