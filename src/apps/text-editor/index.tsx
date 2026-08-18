import { useEffect, useRef, useState } from "react";
import type { TextareaRenderable } from "@opentui/core";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import type { AppComponentProps, AppScrollState } from "../types";
import { windowFocusedAtom, windowManagerAtom, WindowCommand } from "../../desktop/window-manager";
import { useTheme } from "../../ui/theme";

const STARTER_DOCUMENT = `Untitled note

The terminal is quiet tonight.

Write something worth keeping.`;

export function TextEditor({ appId, onScrollStateChange }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
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
    <box flexGrow={1} flexDirection="column" backgroundColor={colors.background}>
      <textarea
        ref={editor}
        focused={focused}
        flexGrow={1}
        initialValue={STARTER_DOCUMENT}
        backgroundColor={colors.background}
        focusedBackgroundColor={colors.background}
        textColor={colors.glowSoft}
        focusedTextColor={colors.glowSoft}
        cursorColor={colors.accent}
        selectionBg={colors.border}
        selectionFg={colors.white}
        wrapMode="word"
        placeholder="Start writing..."
        placeholderColor={colors.muted}
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
          if (key.ctrl && key.name === "n") newDocument();
        }}
      />
    </box>
  );
}
