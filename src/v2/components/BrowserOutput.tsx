import { useMemo } from "react";
import { LocaleString, useVault, useVaultSelector } from "react-iiif-vault";
import invariant from "tiny-invariant";
import { useStore } from "zustand";
import type {
  HistoryItem,
  OutputFormat,
  OutputTarget,
  OutputType,
} from "../../IIIFBrowser.types";
import { getOutputType } from "../../IIIFBrowser.utils";
import { ComboButton } from "../../components/ComboButton";
import { formats } from "../../formats";
import { targets } from "../../targets";
import { useCurrentRoute, useHistory } from "../context";
import { useRouteResource } from "../hooks/use-route-resource";

interface ExplorerOutputProps {
  /**
   * Resource types valid for output. (e.g. Manifest, Canvas)
   */
  types: OutputType[];
  /**
   * Targets of the output. (e.g. clipboard, input)
   *   - first is default.
   */
  targets: OutputTarget[];
  format: OutputFormat;
  output?: { id: string; type: string };
  onSelect?: () => void;
}

// @todo.
const history: any[] = [];
const selected = null as any;

export function useValidTargets(types: OutputType[]) {
  const vault = useVault();
  const resource = useRouteResource();

  return useVaultSelector(() => {
    const validMap: Partial<{
      [K in OutputType]: {
        id: string;
        type: string;
        parent?: HistoryItem | null;
      };
    }> = {};
    let hasValidItem = false;
    let mostSpecificTarget = null;
    if (resource) {
      const historyType = getOutputType(resource);
      if (resource?.type && types.includes(historyType)) {
        hasValidItem = true;
        validMap[historyType] = { ...resource, parent };
        mostSpecificTarget = historyType;
      }
    }
    return [validMap, hasValidItem, mostSpecificTarget] as const;
  }, [history, resource, selected]);
}

export function BrowserOutput(props: ExplorerOutputProps) {
  // @todo
  //   - Get the current valid target from the config + context
  //   - Add list of buttons + callbacks to pass to action bar
  //   - formats..
  const vault = useVault();
  const selectedFormat = formats[props.format.type];

  const validFormats = useMemo(() => {
    const valid: OutputType[] = [];
    for (const type of props.types) {
      if (selectedFormat.supportedTypes.includes(type)) {
        valid.push(type);
      }
    }
    return valid;
  }, [props.types, selectedFormat.supportedTypes]);

  const [valid, hasValid, mostSpecific] = useValidTargets(validFormats);
  const output = mostSpecific ? valid[mostSpecific] : undefined;

  // Configured actions.
  const actions = useMemo(
    () =>
      (props.targets || [])
        .map((type) => {
          const template = targets[type.type];
          if (type.supportedTypes) {
            if (mostSpecific && !type.supportedTypes.includes(mostSpecific)) {
              return null;
            }
          }
          return {
            label: type.label || template.label,
            action: async () => {
              if (mostSpecific) {
                const ref = valid[mostSpecific];
                if (!ref) {
                  // This should not happen.
                  return;
                }
                const format = type.format || props.format;
                const chosenFormat =
                  type.format && formats[format.type]
                    ? formats[format.type]
                    : selectedFormat;
                const formatted = await chosenFormat.format(
                  ref,
                  format as never,
                  vault,
                );
                await template.action(
                  formatted,
                  ref as any,
                  type as any,
                  vault,
                );
                if (props.onSelect) {
                  props.onSelect();
                }
              }
            },
          };
        })
        .filter((t) => t !== null) as Array<{
        label: string;
        action: () => Promise<void>;
      }>,
    [mostSpecific, props, selectedFormat, valid, vault],
  );

  invariant(selectedFormat, "Invalid format selected");

  return (
    <div className="flex gap-4 items-center">
      <div className="flex-1 truncate flex flex-col gap-1">
        {hasValid && output ? (
          <>
            <div className="font-semibold truncate">
              {(output as any).label ? (
                <LocaleString>{(output as any).label}</LocaleString>
              ) : (
                output.type
              )}
            </div>
            <a
              href={output.id}
              target="_blank"
              className="underline text-xs text-blue-500 truncate"
              rel="noreferrer"
            >
              {output.id}
            </a>
          </>
        ) : null}
      </div>
      <div className="flex-shrink-0 text-sm">
        <ComboButton actions={actions} disabled={!hasValid} />
      </div>
    </div>
  );
}
