import { Button, Toolbar } from "react-aria-components";
import { GridIcon } from "../icons/GridIcon";
import { ListIcon } from "../icons/ListIcon";

export function LayoutSwitcher({
  isListView,
  setIsListView,
}: {
  isListView: boolean;
  setIsListView: (value: boolean) => void;
}) {
  return (
    <Toolbar className="inline-flex border rounded border-gray-300 overflow-hidden p-0.5">
      <Button
        aria-label="Grid view"
        aria-selected={!isListView}
        className={
          // biome-ignore lint/style/useTemplate: <explanation>
          `p-2 rounded-sm ` +
          //
          `${!isListView ? "bg-gray-200" : ""}`
        }
        onPress={() => setIsListView(false)}
      >
        <GridIcon />
      </Button>
      <Button
        aria-label="List view"
        aria-selected={isListView}
        className={
          // biome-ignore lint/style/useTemplate: <explanation>
          `p-2 rounded-sm ` +
          //
          `${isListView ? "bg-gray-200" : ""}`
        }
        onPress={() => setIsListView(true)}
      >
        <ListIcon />
      </Button>
    </Toolbar>
  );
}
