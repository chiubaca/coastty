import type { TextProps } from "@opentui/react";

export function CoasttyText({ children, ...props }: Omit<TextProps, "selectable">) {
  return <text {...props} selectable={false}>{children}</text>;
}
