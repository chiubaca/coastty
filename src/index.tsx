import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { ActionStatusProvider } from "./desktop/action-status";
import { Desktop } from "./desktop/desktop";
import { WindowManagerProvider } from "./desktop/window-context";
import { createWindowManager } from "./desktop/window-store";

const renderer = await createCliRenderer({ enableMouseMovement: true });
const windowManager = createWindowManager();

createRoot(renderer).render(
  <WindowManagerProvider manager={windowManager}>
    <ActionStatusProvider>
      <Desktop />
    </ActionStatusProvider>
  </WindowManagerProvider>,
);
