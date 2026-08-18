import { TextAttributes } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import type { TextareaRenderable } from "@opentui/core";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import type { AppComponentProps, AppScrollState } from "../types";
import { windowFocusedAtom, windowManagerAtom, WindowCommand } from "../../desktop/window-manager";

const STARTER_DOCUMENT = `Untitled note

The terminal is quiet tonight.

Write something worth keeping.`;

export function TextEditor({ appId, onScrollStateChange }: AppComponentProps) {
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

  function reportScrollState() {
    const textarea = editor.current;
    if (!textarea || !onScrollStateChange) return;

    const viewport = textarea.editorView.getViewport();
    const totalLines = textarea.editorView.getTotalVirtualLineCount();
    onScrollStateChange({
      position: viewport.offsetY,
      size: totalLines,
      viewportSize: viewport.height,
      scrollTo(position) {
        const currentViewport = textarea.editorView.getViewport();
        const maxPosition = Math.max(0, textarea.editorView.getTotalVirtualLineCount() - currentViewport.height);
        textarea.editorView.setViewport(currentViewport.offsetX, Math.max(0, Math.min(position, maxPosition)), currentViewport.width, currentViewport.height);
        textarea.requestRender();
        reportScrollState();
      },
    } satisfies AppScrollState);
  }

  useEffect(() => {
    reportScrollState();
    return () => onScrollStateChange?.(null);
  }, [onScrollStateChange]);

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
          reportScrollState();
        }}
        onCursorChange={reportScrollState}
        onMouseScroll={() => queueMicrotask(reportScrollState)}
        onSizeChange={reportScrollState}
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
