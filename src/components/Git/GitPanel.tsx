import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { GitBranch, RefreshCw, Plus, Minus, Check } from "lucide-react";
import { useIdeStore } from "../../stores/useIdeStore";

interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export function GitPanel() {
  const workspacePath = useIdeStore((s) => s.workspacePath);
  const [isRepo, setIsRepo] = useState(false);
  const [branch, setBranch] = useState("");
  const [files, setFiles] = useState<GitFileStatus[]>([]);
  const [commitMsg, setCommitMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!workspacePath) return;
    try {
      const repo = await invoke<boolean>("git_is_repo", { workspacePath });
      setIsRepo(repo);
      if (!repo) return;

      const [br, st] = await Promise.all([
        invoke<string>("git_branch_current", { workspacePath }),
        invoke<GitFileStatus[]>("git_status", { workspacePath }),
      ]);
      setBranch(br);
      setFiles(st);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }, [workspacePath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const staged = files.filter((f) => f.staged);
  const unstaged = files.filter((f) => !f.staged && f.status !== "untracked");
  const untracked = files.filter((f) => f.status === "untracked");

  const stageFile = async (path: string) => {
    if (!workspacePath) return;
    try {
      await invoke("git_stage", { workspacePath, filePaths: [path] });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const unstageFile = async (path: string) => {
    if (!workspacePath) return;
    try {
      await invoke("git_unstage", { workspacePath, filePaths: [path] });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const stageAll = async () => {
    if (!workspacePath) return;
    const paths = [...unstaged, ...untracked].map((f) => f.path);
    if (paths.length === 0) return;
    try {
      await invoke("git_stage", { workspacePath, filePaths: paths });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const doCommit = async () => {
    if (!workspacePath || !commitMsg.trim()) return;
    setLoading(true);
    try {
      await invoke<string>("git_commit", { workspacePath, message: commitMsg.trim() });
      setCommitMsg("");
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!workspacePath) {
    return (
      <div className="git-panel-empty">
        <p>Open a workspace to use source control</p>
      </div>
    );
  }

  if (!isRepo) {
    return (
      <div className="git-panel-empty">
        <p>This workspace is not a git repository</p>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "modified": return <span className="git-status-badge modified">M</span>;
      case "added": return <span className="git-status-badge added">A</span>;
      case "deleted": return <span className="git-status-badge deleted">D</span>;
      case "untracked": return <span className="git-status-badge untracked">U</span>;
      case "renamed": return <span className="git-status-badge renamed">R</span>;
      default: return <span className="git-status-badge">{status[0]?.toUpperCase()}</span>;
    }
  };

  return (
    <div className="git-panel">
      <div className="git-panel-header">
        <GitBranch size={13} />
        <span className="git-branch-name">{branch}</span>
        <button className="git-refresh-btn" onClick={refresh} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {error && <div className="git-error">{error}</div>}

      {/* Commit input */}
      <div className="git-commit-area">
        <input
          className="git-commit-input"
          placeholder="Commit message..."
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doCommit()}
          disabled={loading}
        />
        <button
          className="btn-primary git-commit-btn"
          onClick={doCommit}
          disabled={loading || !commitMsg.trim() || staged.length === 0}
          title={staged.length === 0 ? "Stage changes first" : "Commit"}
        >
          <Check size={13} /> Commit
        </button>
      </div>

      <div className="git-file-list">
        {/* Staged Changes */}
        {staged.length > 0 && (
          <div className="git-section">
            <div className="git-section-header">
              <span>Staged Changes</span>
              <span className="git-section-count">{staged.length}</span>
            </div>
            {staged.map((f) => (
              <div key={`s-${f.path}`} className="git-file-item">
                {statusIcon(f.status)}
                <span className="git-file-path">{f.path}</span>
                <button className="git-file-action" onClick={() => unstageFile(f.path)} title="Unstage">
                  <Minus size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Unstaged Changes */}
        {(unstaged.length > 0 || untracked.length > 0) && (
          <div className="git-section">
            <div className="git-section-header">
              <span>Changes</span>
              <span className="git-section-count">{unstaged.length + untracked.length}</span>
              <button className="git-file-action" onClick={stageAll} title="Stage All">
                <Plus size={12} />
              </button>
            </div>
            {[...unstaged, ...untracked].map((f) => (
              <div key={`u-${f.path}`} className="git-file-item">
                {statusIcon(f.status)}
                <span className="git-file-path">{f.path}</span>
                <button className="git-file-action" onClick={() => stageFile(f.path)} title="Stage">
                  <Plus size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <div className="git-panel-empty">
            <p>No changes</p>
          </div>
        )}
      </div>
    </div>
  );
}
