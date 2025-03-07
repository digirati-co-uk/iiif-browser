import { Button } from "react-aria-components";
import { useAvailableOutputs, useSelectedActions } from "../context";

export function BrowserOutputActions() {
  const availableOutputs = useAvailableOutputs();
  const { runTargetAction } = useSelectedActions();

  const first = availableOutputs[0];
  if (!first) {
    return <div>No outputs available</div>;
  }

  return (
    <div className="flex-shrink-0 flex gap-2 items-center">
      <Button
        className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
        onPress={() => runTargetAction(first)}
      >
        {first.label}
      </Button>
    </div>
  );
}
