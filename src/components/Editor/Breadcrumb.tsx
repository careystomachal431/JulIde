import { ChevronRight } from "lucide-react";
import { useIdeStore } from "../../stores/useIdeStore";

export function Breadcrumb() {
  const activeTabId = useIdeStore((s) => s.activeTabId);
  const openTabs = useIdeStore((s) => s.openTabs);
  const workspacePath = useIdeStore((s) => s.workspacePath);

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  if (!activeTab) return null;

  let relativePath = activeTab.path;
  if (workspacePath && relativePath.startsWith(workspacePath)) {
    relativePath = relativePath.slice(workspacePath.length + 1);
  }

  const segments = relativePath.split(/[/\\]/);

  return (
    <div className="breadcrumb">
      {segments.map((segment, i) => (
        <span key={i} className="breadcrumb-segment">
          {i > 0 && <ChevronRight size={12} className="breadcrumb-separator" />}
          <span className={i === segments.length - 1 ? "breadcrumb-current" : "breadcrumb-dir"}>
            {segment}
          </span>
        </span>
      ))}
    </div>
  );
}
