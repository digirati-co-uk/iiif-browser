import { Button } from "react-aria-components";
import { twMerge } from "tailwind-merge";
import {
  useAvailableOutputs,
  useSelectedActions,
  useUIConfig,
} from "../context";

export function BrowserOutputActions() {
  const availableOutputs = useAvailableOutputs();
  const { runTargetAction } = useSelectedActions();
  const { buttonClassName } = useUIConfig();

  const first = availableOutputs[0];
  if (!first) {
    return (
      <div className="px-4 text-sm opacity-40 whitespace-nowrap">
        No actions available
      </div>
    );
  }

  const className = first.buttonClassName || buttonClassName;

  return (
    <div
      aria-label="Output actions"
      className="flex-shrink-0 flex gap-2 items-center whitespace-nowrap"
    >
      <Button
        aria-label={first.label}
        className={twMerge(
          "bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded",
          className,
        )}
        onPress={() => runTargetAction(first)}
      >
        {first.label}
      </Button>
    </div>
  );
}
