import { useCallback, useRef, useEffect, useState } from "react";
import { EditorTabs } from "./EditorTabs";
import { Breadcrumb } from "./Breadcrumb";
import { MonacoEditor } from "./MonacoEditor";
import { useIdeStore } from "../../stores/useIdeStore";

export function EditorSplitContainer() {
  const splitEditorOpen = useIdeStore((s) => s.splitEditorOpen);
  const splitTabId = useIdeStore((s) => s.splitTabId);
  const openTabs = useIdeStore((s) => s.openTabs);

  const splitTab = openTabs.find((t) => t.id === splitTabId) ?? null;

  const [splitWidth, setSplitWidth] = useState(50); // percentage
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitWidth(Math.max(20, Math.min(80, pct)));
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (!splitEditorOpen || !splitTab) {
    return (
      <>
        <EditorTabs />
        <Breadcrumb />
        <div className="ide-editor-area">
          <MonacoEditor />
        </div>
      </>
    );
  }

  return (
    <div ref={containerRef} className="split-editor-container">
      <div className="split-editor-pane" style={{ width: `${splitWidth}%` }}>
        <EditorTabs />
        <div className="ide-editor-area">
          <MonacoEditor />
        </div>
      </div>
      <div className="split-editor-handle" onMouseDown={onDragStart} />
      <div className="split-editor-pane" style={{ width: `${100 - splitWidth}%` }}>
        <div className="split-editor-tab-bar">
          <span className="split-editor-tab active">{splitTab.name}</span>
        </div>
        <div className="ide-editor-area">
          <MonacoEditor key={`split-${splitTab.id}`} />
        </div>
      </div>
    </div>
  );
}
