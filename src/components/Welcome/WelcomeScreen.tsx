import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen } from "lucide-react";
import { useIdeStore } from "../../stores/useIdeStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import type { FileNode } from "../../types";

export function WelcomeScreen() {
  const setWorkspace = useIdeStore((s) => s.setWorkspace);
  const recentWorkspaces = useSettingsStore((s) => s.settings.recentWorkspaces);
  const [juliaVersion, setJuliaVersion] = useState("Detecting...");

  useEffect(() => {
    invoke<string>("julia_get_version")
      .then(setJuliaVersion)
      .catch(() => setJuliaVersion("Julia not found"));
  }, []);

  const openFolder = async () => {
    const path = await invoke<string | null>("dialog_open_folder");
    if (!path) return;
    const tree = await invoke<FileNode>("fs_get_tree", { path });
    setWorkspace(path, tree);
    invoke("settings_add_recent_workspace", { workspacePath: path }).catch(console.error);
  };

  const openRecent = async (path: string) => {
    try {
      const tree = await invoke<FileNode>("fs_get_tree", { path });
      setWorkspace(path, tree);
      invoke("settings_add_recent_workspace", { workspacePath: path }).catch(console.error);
    } catch {
      // Directory may no longer exist
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">julIDE</h1>
        <p className="welcome-subtitle">An IDE for Julia</p>
        <p className="welcome-julia-version">{juliaVersion}</p>

        <div className="welcome-actions">
          <button className="btn-primary welcome-open-btn" onClick={openFolder}>
            <FolderOpen size={16} /> Open Folder
          </button>
        </div>

        {recentWorkspaces.length > 0 && (
          <div className="welcome-recent">
            <h3 className="welcome-recent-title">Recent</h3>
            {recentWorkspaces.map((path) => (
              <button
                key={path}
                className="welcome-recent-item"
                onClick={() => openRecent(path)}
              >
                <span className="welcome-recent-name">{path.split(/[/\\]/).pop()}</span>
                <span className="welcome-recent-path">{path}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
