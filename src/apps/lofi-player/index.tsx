import { TextAttributes } from "@opentui/core";
import { useWindow } from "../../desktop/window-context";

export function LofiPlayer() {
  const { setTitle } = useWindow();

  return (
    <box padding={2} flexGrow={1} flexDirection="column" gap={1}>
      <box onMouseDown={() => setTitle("lofi.fm - Night Bus Radio")}>
        <text fg="#ffffff" attributes={TextAttributes.BOLD}>Night Bus Radio</text>
      </box>
      <text fg="#ffffff">rain on glass / side a</text>
      <text fg="#ffffff">[======----------]  2:14</text>
      <text fg="#ffffff" attributes={TextAttributes.DIM}>Click the station name to update the window title.</text>
    </box>
  );
}
