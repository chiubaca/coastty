import { TextAttributes } from "@opentui/core";
import type { AppComponentProps } from "../types";
import { CoasttyText } from "../../ui/coastty-text";
import { useTheme } from "../../ui/theme";

export function About(_props: AppComponentProps) {
  const { theme: { colors } } = useTheme();

  return (
    <box flexGrow={1} flexDirection="column" gap={1} backgroundColor={colors.background}>
      <CoasttyText fg={colors.highlight} attributes={TextAttributes.BOLD}>CoasTTY</CoasttyText>
      <CoasttyText fg={colors.glowSoft} wrapMode="word">
        relax, slow down, and enjoy the revolution unfold.
      </CoasttyText>
      <CoasttyText fg={colors.primary} wrapMode="word">
        CoasTTY is where end of the day meets digital serenity.
      </CoasttyText>
    </box>
  );
}
