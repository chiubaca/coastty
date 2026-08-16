import { TextAttributes } from "@opentui/core";
import { useAtomSet } from "@effect-atom/atom-react/Hooks";
import type { AppComponentProps } from "../types";
import { windowManagerAtom, WindowCommand } from "../../desktop/window-manager";

export function LofiPlayer({ appId }: AppComponentProps) {
  const dispatchWindow = useAtomSet(windowManagerAtom);

  return (
    <box padding={2} flexGrow={1} flexDirection="column" gap={1}>
      <box
        onMouseDown={() =>
          dispatchWindow(WindowCommand.SetTitle({ appId, title: "lofi.fm - Night Bus Radio" }))
        }
      >
        <text fg="#ffffff" attributes={TextAttributes.BOLD}>Night Bus Radio</text>
      </box>
      <text fg="#ffffff">rain on glass / side a</text>
      <text fg="#ffffff">[======----------]  2:14</text>
      <text fg="#ffffff" attributes={TextAttributes.DIM}>Click the station name to update the window title.</text>
    </box>
  );
}
