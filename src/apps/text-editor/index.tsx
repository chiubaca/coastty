import { TextAttributes } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import type { TextareaRenderable } from "@opentui/core";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import type { AppComponentProps } from "../types";
import { windowFocusedAtom, windowManagerAtom, WindowCommand } from "../../desktop/window-manager";

const STARTER_DOCUMENT = `Untitled note

The terminal is quiet tonight.

Write something worth keeping.`;

export function TextEditor({ appId }: AppComponentProps) {
  const editor = useRef<TextareaRenderable>(null);
  const loadedInitialContent = useRef(false);
  const [dirty, setDirty] = useState(false);
  const focused = useAtomValue(windowFocusedAtom(appId));
  const dispatchWindow = useAtomSet(windowManagerAtom);

  useEffect(() => {
    dispatchWindow(
      WindowCommand.SetTitle({ appId, title: dirty ? "Untitled note *" : "Untitled note" }),
    );
  }, [appId, dirty, dispatchWindow]);

  function save() {
    setDirty(false);
  }

  function newDocument() {
    editor.current?.editBuffer.setText("");
    setDirty(false);
    editor.current?.focus();
  }

  return (
    <box flexGrow={1} flexDirection="column" backgroundColor="#f2eedc">
      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor="#d7cfb3">
        <text fg="#292419" attributes={TextAttributes.BOLD}>UNTITLED NOTE{dirty ? "  *" : ""}</text>
        <text fg="#5a513b">PLAIN TEXT</text>
      </box>
      <box height={1} paddingX={1} gap={2} backgroundColor="#ebe4cc">
        <text fg="#292419" onMouseDown={newDocument}>[ New ]</text>
        <text fg="#292419" onMouseDown={save}>[ Save ]</text>
        <text fg="#756b51">Ctrl+S saves</text>
      </box>
      <textarea
        ref={editor}
        focused={focused}
        flexGrow={1}
        initialValue={STARTER_DOCUMENT}
        backgroundColor="#f2eedc"
        focusedBackgroundColor="#f2eedc"
        textColor="#292419"
        focusedTextColor="#292419"
        cursorColor="#d14f2a"
        selectionBg="#d9c595"
        selectionFg="#292419"
        wrapMode="word"
        placeholder="Start writing..."
        placeholderColor="#998f76"
        onContentChange={() => {
          if (loadedInitialContent.current) setDirty(true);
          else loadedInitialContent.current = true;
        }}
        onKeyDown={(key) => {
          if (key.ctrl && key.name === "s") save();
        }}
      />
      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor="#d7cfb3">
        <text fg="#5a513b">Click to edit</text>
        <text fg="#5a513b">AUTOSAVE OFF</text>
      </box>
    </box>
  );
}
