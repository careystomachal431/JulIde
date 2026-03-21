import { useCallback } from "react";
import { X } from "lucide-react";
import { useIdeStore } from "../../stores/useIdeStore";

export function EditorTabs() {
  const openTabs = useIdeStore((s) => s.openTabs);
  const activeTabId = useIdeStore((s) => s.activeTabId);
  const setActiveTab = useIdeStore((s) => s.setActiveTab);
  const closeTab = useIdeStore((s) => s.closeTab);

  const handleClose = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      closeTab(id);
    },
    [closeTab]
  );

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(id);
      }
    },
    [closeTab]
  );

  if (openTabs.length === 0) {
    return <div className="editor-tabs editor-tabs-empty" />;
  }

  return (
    <div className="editor-tabs">
      {openTabs.map((tab) => (
        <div
          key={tab.id}
          className={`editor-tab ${tab.id === activeTabId ? "active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
          onMouseDown={(e) => handleMiddleClick(e, tab.id)}
          title={tab.path}
        >
          <span className="editor-tab-name">{tab.name}</span>
          {tab.isDirty && <span className="editor-tab-dirty" title="Unsaved changes">●</span>}
          <button
            className="editor-tab-close"
            onClick={(e) => handleClose(e, tab.id)}
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
