# julIDE Documentation

Comprehensive technical documentation for julIDE — a Julia IDE built with Tauri 2, React, and Rust.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation & Setup](#2-installation--setup)
3. [User Guide](#3-user-guide)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [IPC Protocol](#6-ipc-protocol)
7. [LSP Integration](#7-lsp-integration)
8. [Julia Runtime Management](#8-julia-runtime-management)
9. [Terminal & PTY](#9-terminal--pty)
10. [Debugger](#10-debugger)
11. [Git Integration](#11-git-integration)
12. [File System Operations](#12-file-system-operations)
13. [Settings & Persistence](#13-settings--persistence)
14. [Theming](#14-theming)
15. [Build & Distribution](#15-build--distribution)

---

## 1. Overview

julIDE is a native desktop IDE specifically designed for Julia development. It uses a split architecture:

- **Frontend** (React + TypeScript): Handles all UI rendering, user interactions, and state management. The code editor is Monaco Editor; the terminal is xterm.js.
- **Backend** (Rust + Tauri 2): Handles native operations — file I/O, process spawning, PTY management, git operations, file watching, and bridging to Julia processes (LSP, debugger, REPL).

The two layers communicate via Tauri's IPC mechanism: the frontend calls Rust functions with `invoke()`, and the backend pushes events to the frontend with `emit()`.

### Design Principles

- **Julia-first**: Every feature is designed with Julia workflows in mind (Revise.jl hot-reload, Pluto notebooks, rich MIME output).
- **Native performance**: Rust backend for all I/O-heavy operations. No Electron; final binary is ~10-15MB.
- **Single-window**: Everything happens in one window with resizable panels (no floating windows except Pluto).
- **Minimal dependencies**: The frontend has no routing library, no CSS framework, no form library. Just React, Zustand, Monaco, and xterm.

---

## 2. Installation & Setup

### System Requirements

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| **macOS** | 10.15+ (Catalina) | 13+ (Ventura) |
| **Linux** | Ubuntu 20.04+ / Fedora 35+ | Ubuntu 22.04+ |
| **Windows** | Windows 10 (1803+) | Windows 11 |

### Dependencies

| Tool | Purpose | Install |
|------|---------|---------|
| Rust (stable) | Build the Tauri backend | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Bun | Frontend package manager and script runner | `curl -fsSL https://bun.sh/install \| bash` |
| Julia 1.6+ | The language julIDE supports | [julialang.org/downloads](https://julialang.org/downloads/) |
| Tauri CLI v2 | Build tool for Tauri apps | `cargo install tauri-cli --version "^2"` |

#### Linux-specific system packages

```bash
# Ubuntu / Debian
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf libgtk-3-dev libsoup-3.0-dev javascriptcoregtk-4.1-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel \
  librsvg2-devel patchelf gtk3-devel libsoup3-devel javascriptcoregtk4.1-devel
```

### Julia Packages (Optional but Recommended)

```julia
using Pkg
Pkg.add("LanguageServer")  # Autocompletion, diagnostics, hover
Pkg.add("Revise")          # Hot-reload on save
Pkg.add("Debugger")        # Breakpoints and stepping
Pkg.add("Pluto")           # Reactive notebooks
```

### Building from Source

```bash
git clone https://github.com/sinisterMage/JulIde.git
cd JulIde
bun install                 # Install frontend dependencies
bun run tauri dev             # Development mode with hot reload
bun run tauri build           # Production build with installers
```

---

## 3. User Guide

### Opening a Workspace

- Click **Open Folder** in the toolbar, file explorer, or welcome screen.
- Use the command palette: `Cmd/Ctrl+Shift+P` → "Open Folder".
- Recent workspaces appear on the welcome screen.

### Editing Files

- Click a file in the explorer to open it in a tab.
- Use `Cmd/Ctrl+P` (Quick Open) for fuzzy file search.
- `Cmd/Ctrl+F` for find, `Cmd/Ctrl+H` for find and replace.
- `Cmd/Ctrl+S` to save (auto-save is also active by default after 800ms).

### Running Julia Code

- Click the **Play** button in the toolbar or use the command palette → "Run Julia File".
- Output appears in the Output panel with rich rendering (images, HTML, SVG).
- Click the **Stop** button to kill a running process.

### Using the Terminal

- The terminal panel shows at the bottom. Click the **+** button to create additional terminals.
- Each terminal is an independent Julia REPL with a PTY session.
- If Revise.jl is toggled on, `using Revise` is injected automatically on REPL startup.

### Debugging

1. Click the gutter (line number area) in the editor to set breakpoints (purple dots).
2. Click the **Bug** icon in the toolbar to start debugging.
3. When paused at a breakpoint, use the toolbar controls: Continue, Step Over, Step Into, Step Out, Stop.
4. The Debug panel shows variables and their values.

### Git

- Click the **Git Branch** icon in the activity bar (left) to open the source control view.
- Files are grouped into **Staged Changes** and **Changes** (unstaged + untracked).
- Click **+** to stage, **-** to unstage. Type a commit message and click **Commit**.
- The current branch is shown in the status bar.

### Package Management

- Open the **Packages** tab in the bottom panel.
- Type a package name and click **Add** to install via `Pkg.add`.
- Click the trash icon on a package to remove it via `Pkg.rm`.

### Search

- `Cmd/Ctrl+Shift+F` opens the global search in the sidebar.
- Supports regex, case sensitivity, and file glob filters (e.g., `*.jl`).
- Click a result to jump to the file and line.

### Settings

- `Cmd/Ctrl+,` or Command Palette → "Open Settings".
- Changes are saved immediately and take effect in real-time.
- Settings file: `~/.config/julide/settings.json`.

---

## 4. Frontend Architecture

### Component Hierarchy

```
App.tsx
├── Toolbar
├── ActivityBar
├── Sidebar (conditional)
│   ├── FileExplorer
│   ├── SearchPanel
│   └── GitPanel
├── EditorSplitContainer
│   ├── EditorTabs
│   ├── Breadcrumb
│   └── MonacoEditor
├── BottomPanel
│   ├── OutputPanel
│   ├── TerminalPanel
│   ├── ProblemsPanel
│   ├── DebugPanel
│   └── PackageManager
├── StatusBar
├── CommandPalette (overlay)
├── QuickOpen (overlay)
└── SettingsPanel (overlay)
```

### State Management

Two Zustand stores with Immer middleware:

**`useIdeStore`** — Runtime state:
- `workspacePath`, `fileTree` — Current workspace
- `openTabs`, `activeTabId` — Editor tabs
- `splitTabId`, `splitEditorOpen` — Split editor
- `juliaVersion`, `juliaEnv`, `isRunning` — Julia runtime
- `output`, `problems` — Output and diagnostics
- `activeBottomPanel`, `bottomPanelHeight`, `sidebarWidth` — Layout
- `activeSidebarView` — Which sidebar view is active (files/search/git)
- `breakpoints`, `debug` — Debugger state
- `terminalSessions`, `activeTerminalId` — Multi-terminal
- `searchResults`, `searchQuery`, `isSearching` — Global search
- `lspStatus`, `reviseEnabled`, `plutoStatus` — Service status
- `editorInstance` — Monaco editor ref for triggering actions externally
- `commandPaletteOpen`, `quickOpenOpen` — Overlay visibility

**`useSettingsStore`** — Persisted state:
- `settings` — Font size, theme, tab size, word wrap, minimap, etc.
- `loaded` — Whether settings have been loaded from disk
- `settingsOpen` — Whether the settings panel is visible

### Key Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `@monaco-editor/react` | 4.7.0 | React wrapper for Monaco Editor |
| `monaco-editor` | 0.55.1 | Code editor engine |
| `@xterm/xterm` | 6.0.0 | Terminal emulator |
| `@xterm/addon-fit` | 0.10.0 | Auto-resize terminal to container |
| `@xterm/addon-web-links` | 0.11.0 | Clickable URLs in terminal |
| `zustand` | 5.0.12 | State management |
| `immer` | 11.1.4 | Immutable state updates |
| `lucide-react` | 0.577.0 | Icons |

---

## 5. Backend Architecture

Each Rust module in `src-tauri/src/` handles one domain:

| Module | Responsibility |
|--------|---------------|
| `lib.rs` | Tauri builder, plugin registration, command handler registration |
| `julia.rs` | Find Julia, run scripts, precompile, clean, Pkg.add/rm |
| `lsp.rs` | Spawn LanguageServer.jl, JSON-RPC protocol over stdio |
| `pty.rs` | Manage PTY sessions for the interactive terminal |
| `debugger.rs` | Spawn Debugger.jl, send step/continue commands, parse output |
| `fs.rs` | File tree, read/write/create/delete/rename, native dialogs |
| `git.rs` | All git operations via libgit2 (status, stage, commit, diff, branches) |
| `search.rs` | Walk workspace tree, regex match file contents |
| `watcher.rs` | Watch workspace for external file changes |
| `settings.rs` | Load/save JSON settings to the platform config directory |
| `pluto.rs` | Spawn Pluto.jl server, extract URL, open in Tauri webview |

### Shared State

- **`JuliaState`** — Tracks the PID of the running Julia process (for `julia_kill`).
- **`JULIA_PATH`** — Cached path to the Julia binary (lazy static).
- **`LSP_STATE`** — Singleton LSP process state (stdin writer, pending requests, open documents).
- **`WATCHER`** — Singleton file watcher instance.
- **`PLUTO_STATE`** — Singleton Pluto server process.

### Cargo Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri` | 2 | Desktop app framework |
| `tokio` | 1 (full) | Async runtime for spawning processes |
| `portable-pty` | 0.8 | Cross-platform PTY for terminal |
| `git2` | 0.19 | libgit2 bindings for git operations |
| `serde` / `serde_json` | 1 | Serialization for IPC |
| `walkdir` | 2 | Recursive directory traversal |
| `regex` | 1 | Regular expression matching in search |
| `glob` | 0.3 | File glob pattern matching |
| `notify` | 7 | File system change notifications |
| `once_cell` | 1 | Lazy static initialization |
| `uuid` | 1 | Unique ID generation |
| `dirs-next` | 2 | Platform config directory paths |
| `libc` | 0.2 | Unix signal handling (SIGTERM) |

---

## 6. IPC Protocol

### Invoke (Frontend → Backend)

```typescript
// Frontend calls a Rust command
const result = await invoke<ReturnType>("command_name", {
  argName: argValue,
});
```

The arguments are serialized as JSON. The Rust function receives them via `serde` deserialization. Return values are `Result<T, String>` — success returns `T`, errors return a string message.

### Events (Backend → Frontend)

```rust
// Rust emits an event
app.emit("event-name", PayloadStruct { field: value })?;
```

```typescript
// Frontend listens
const unlisten = await listen<PayloadType>("event-name", (event) => {
  console.log(event.payload);
});
```

### Event Catalog

| Event | Payload | Source |
|-------|---------|--------|
| `julia-output` | `{ kind, text, exit_code? }` | `julia.rs` — script stdout/stderr/done |
| `pty-output` | `{ session_id, data }` | `pty.rs` — terminal output |
| `lsp-status` | `{ status, message? }` | `lsp.rs` — LSP lifecycle |
| `lsp-notification` | `{ method, params, id? }` | `lsp.rs` — LSP push notifications |
| `debug-stopped` | `{ file, line, reason }` | `debugger.rs` — breakpoint hit |
| `debug-output` | `{ kind, text }` | `debugger.rs` — debugger stdout |
| `debug-variables` | `{ variables[] }` | `debugger.rs` — variable values |
| `fs-changed` | `{ path, kind }` | `watcher.rs` — file create/modify/remove |
| `pluto-status` | `{ status, message? }` | `pluto.rs` — Pluto server lifecycle |

### Command Catalog

| Command | Module | Description |
|---------|--------|-------------|
| `fs_get_tree` | `fs.rs` | Get recursive file tree for a path |
| `fs_read_file` | `fs.rs` | Read file contents |
| `fs_write_file` | `fs.rs` | Write file contents |
| `fs_create_file` | `fs.rs` | Create empty file |
| `fs_create_dir` | `fs.rs` | Create directory |
| `fs_delete_entry` | `fs.rs` | Delete file or directory |
| `fs_rename` | `fs.rs` | Rename/move file or directory |
| `fs_exists` | `fs.rs` | Check if path exists |
| `dialog_open_file` | `fs.rs` | Native file open dialog |
| `dialog_open_folder` | `fs.rs` | Native folder open dialog |
| `dialog_save_file` | `fs.rs` | Native file save dialog |
| `julia_get_version` | `julia.rs` | Get Julia version string |
| `julia_list_environments` | `julia.rs` | List available Julia environments |
| `julia_run` | `julia.rs` | Run a Julia script file |
| `julia_precompile` | `julia.rs` | Precompile project packages |
| `julia_clean` | `julia.rs` | Remove Manifest.toml and cache |
| `julia_kill` | `julia.rs` | Kill running Julia process |
| `julia_set_path` | `julia.rs` | Manually set Julia binary path |
| `julia_pkg_add` | `julia.rs` | Add a Julia package via Pkg.jl |
| `julia_pkg_rm` | `julia.rs` | Remove a Julia package via Pkg.jl |
| `pty_create` | `pty.rs` | Create a new PTY terminal session |
| `pty_write` | `pty.rs` | Send data to PTY stdin |
| `pty_resize` | `pty.rs` | Resize PTY dimensions |
| `pty_close` | `pty.rs` | Close a PTY session |
| `lsp_start` | `lsp.rs` | Start the Julia Language Server |
| `lsp_stop` | `lsp.rs` | Stop the Language Server |
| `lsp_send_request` | `lsp.rs` | Send a JSON-RPC request to LSP |
| `lsp_send_notification` | `lsp.rs` | Send a JSON-RPC notification |
| `lsp_send_response` | `lsp.rs` | Respond to a server-initiated request |
| `debug_start` | `debugger.rs` | Start debugging a file |
| `debug_continue` | `debugger.rs` | Continue execution |
| `debug_step_over` | `debugger.rs` | Step over current line |
| `debug_step_into` | `debugger.rs` | Step into function call |
| `debug_step_out` | `debugger.rs` | Step out of current function |
| `debug_stop` | `debugger.rs` | Stop debugging |
| `debug_set_breakpoint` | `debugger.rs` | Add a breakpoint |
| `debug_remove_breakpoint` | `debugger.rs` | Remove a breakpoint |
| `debug_get_breakpoints` | `debugger.rs` | List all breakpoints |
| `debug_get_variables` | `debugger.rs` | Get current scope variables |
| `git_is_repo` | `git.rs` | Check if workspace is a git repo |
| `git_branch_current` | `git.rs` | Get current branch name |
| `git_branches` | `git.rs` | List local branches |
| `git_status` | `git.rs` | Get changed files with status |
| `git_diff` | `git.rs` | Get unified diff for a file |
| `git_stage` | `git.rs` | Stage files |
| `git_unstage` | `git.rs` | Unstage files |
| `git_commit` | `git.rs` | Commit staged changes |
| `git_log` | `git.rs` | Get recent commit history |
| `git_checkout_branch` | `git.rs` | Switch branches |
| `fs_search_files` | `search.rs` | Search file contents across workspace |
| `watcher_start` | `watcher.rs` | Start watching workspace for changes |
| `watcher_stop` | `watcher.rs` | Stop file watching |
| `settings_load` | `settings.rs` | Load settings from disk |
| `settings_save` | `settings.rs` | Save settings to disk |
| `settings_add_recent_workspace` | `settings.rs` | Add path to recent workspaces list |
| `pluto_open` | `pluto.rs` | Open a .jl file as a Pluto notebook |
| `pluto_stop` | `pluto.rs` | Stop the Pluto server |

---

## 7. LSP Integration

### Architecture

```
Monaco Editor (frontend)
    │
    ├── juliaProviders.ts ──→ LspClient.ts ──→ invoke("lsp_send_request")
    │                                                │
    │                                                ▼
    │                                          lsp.rs (Rust)
    │                                                │
    │                                          stdio JSON-RPC
    │                                                │
    │                                                ▼
    │                                    LanguageServer.jl (Julia)
    │
    └── listen("lsp-notification") ←── app.emit("lsp-notification")
```

### Supported LSP features

| Feature | LSP Method | Monaco Provider |
|---------|-----------|----------------|
| Autocompletion | `textDocument/completion` | `CompletionItemProvider` |
| Hover | `textDocument/hover` | `HoverProvider` |
| Go to Definition | `textDocument/definition` | `DefinitionProvider` |
| Find References | `textDocument/references` | `ReferenceProvider` |
| Signature Help | `textDocument/signatureHelp` | `SignatureHelpProvider` |
| Diagnostics | `textDocument/publishDiagnostics` | Markers via `setMonacoMarkers` |
| Document Symbols | `textDocument/documentSymbol` | Available via `LspClient` |
| Workspace Symbols | `workspace/symbol` | Available via `LspClient` |

### Document Lifecycle

1. **Open**: When a `.jl` file is opened in a tab, `didOpen` is sent to LSP.
2. **Edit**: Content changes are debounced (300ms) and sent via `didChange`.
3. **Close**: When a tab is closed, `didClose` is sent.
4. **Version tracking**: Each file URI tracks an incrementing version number for change detection.

---

## 8. Julia Runtime Management

### Julia Discovery

The `find_julia()` function in `julia.rs` searches for Julia in this order:

1. `$JULIA_PATH` environment variable
2. `$SHELL -l -c "which julia"` (login shell PATH)
3. `~/.juliaup/bin/julia`
4. `/opt/homebrew/bin/julia`, `/usr/local/bin/julia`, `/usr/bin/julia`
5. `/Applications/Julia*.app/Contents/Resources/julia/bin/julia` (macOS)

The result is cached in a lazy static for subsequent calls.

### Script Execution

`julia_run` spawns a Julia process with:
- A custom MIME display helper prepended to the script
- `--project=<workspace>` if a workspace is open
- stdout/stderr streamed line-by-line via `julia-output` events

The MIME helper (`_JulIDEMIMEDisplay_`) intercepts rich display calls and emits them as `%%JULIDE_MIME%%{json}%%` markers, which the OutputPanel renders as images, HTML, or SVG.

### Package Management

- `julia_pkg_add(packageName, projectPath)` → spawns `julia -e 'using Pkg; Pkg.add("X")'`
- `julia_pkg_rm(packageName, projectPath)` → spawns `julia -e 'using Pkg; Pkg.rm("X")'`

Output is streamed via `julia-output` events. The PackageManager component listens for the `done` event to refresh the package list.

---

## 9. Terminal & PTY

### Architecture

```
xterm.js (frontend)  ⟷  pty.rs (Rust)  ⟷  Julia REPL (PTY child process)
```

- **`pty_create`** spawns a Julia process in a pseudo-terminal (via `portable-pty`).
- **`pty_write`** sends keystrokes from xterm.js to the PTY stdin.
- **`pty-output`** events carry raw terminal data from the PTY to xterm.js.
- **`pty_resize`** syncs the PTY dimensions when the container resizes.

### Multi-terminal

The backend stores sessions in a `HashMap<String, PtySession>`. The frontend manages a list of `terminalSessions` in the store, each with a unique ID. xterm.js instances are created per session and shown/hidden (not destroyed) when switching tabs.

### Revise.jl Integration

When `reviseEnabled` is true:
- On terminal creation, `using Revise\n` is injected after a 2.5s delay.
- On file save, `Revise.revise()\n` is sent to the main terminal PTY.

---

## 10. Debugger

### Architecture

`debugger.rs` spawns Julia with Debugger.jl:

```julia
using Debugger
@bp_set("file.jl", 10)  # Pre-set breakpoints
include("file.jl")
```

Communication happens via stdin/stdout:
- **Step commands** (`c` for continue, `n` for next, `s` for step in, `f` for finish) are written to stdin.
- **Stopped events** are parsed from stdout when the debugger pauses.
- **Variable inspection** uses `varinfo()` output.

### Frontend

- Breakpoints are stored in `useIdeStore.breakpoints` as `{file, line}` pairs.
- Clicking the editor gutter toggles breakpoints.
- The DebugPanel displays variables, call stack, and breakpoint list.
- Current line highlighting (yellow) shows where execution is paused.

---

## 11. Git Integration

All git operations use the `git2` Rust crate (libgit2 bindings) — no shell dependency on `git`.

### Supported Operations

| Operation | Command | Description |
|-----------|---------|-------------|
| Status | `git_status` | Modified, added, deleted, untracked files |
| Stage | `git_stage` | Add files to index |
| Unstage | `git_unstage` | Reset index entry to HEAD |
| Commit | `git_commit` | Create commit from staged changes |
| Diff | `git_diff` | Unified diff (index to workdir) |
| Log | `git_log` | Recent commits with message, author, time |
| Branches | `git_branches` | List local branches |
| Checkout | `git_checkout_branch` | Switch branches |

### Frontend

- **GitPanel** shows files grouped by staged/unstaged/untracked.
- **StatusBar** displays the current branch name.
- Stage/unstage buttons appear on hover over each file.

---

## 12. File System Operations

### File Tree

`fs_get_tree` recursively walks a directory and returns a `FileNode` tree. Filtered directories: `.git`, `node_modules`, `target`, `__pycache__`, and hidden directories (starting with `.`).

### File Watching

`watcher.rs` uses the `notify` crate with `RecommendedWatcher`. It watches the workspace recursively and emits `fs-changed` events. The frontend debounces tree refreshes (500ms) and reloads open file content if the file was modified externally and the tab is not dirty.

### Global Search

`search.rs` walks the workspace with `walkdir`, reads each file, and matches lines against a `regex`. Results are capped at 5000 entries. Binary files (containing null bytes) and files larger than 2MB are skipped.

---

## 13. Settings & Persistence

### Storage Location

| Platform | Path |
|----------|------|
| Linux | `~/.config/julide/settings.json` |
| macOS | `~/Library/Application Support/julide/settings.json` |
| Windows | `%APPDATA%/julide/settings.json` |

### Schema

```json
{
  "fontSize": 14,
  "fontFamily": "'JetBrains Mono', 'Fira Code', ...",
  "tabSize": 4,
  "minimapEnabled": true,
  "wordWrap": "off",
  "autoSave": true,
  "theme": "julide-dark",
  "terminalFontSize": 13,
  "recentWorkspaces": ["/path/to/project1", "/path/to/project2"]
}
```

Missing fields use defaults. The file is created on first save.

---

## 14. Theming

### Architecture

Themes are defined in `src/themes/themes.ts`. Each theme provides:
- A **Monaco editor theme** (token colors, editor background, cursor color, etc.)
- A **CSS class** applied to the root element
- A **terminal color scheme**

### CSS Variables

All UI colors use CSS custom properties defined in `:root` (dark) and `.theme-light` (light override). Key variables:

| Variable | Dark | Light |
|----------|------|-------|
| `--bg-primary` | `#1e1e1e` | `#ffffff` |
| `--bg-secondary` | `#252526` | `#f3f3f3` |
| `--text-primary` | `#cccccc` | `#1e1e1e` |
| `--accent` | `#9558B2` | `#7B3F9E` |
| `--accent-green` | `#389826` | `#2B7F1C` |
| `--accent-red` | `#CB3C33` | `#C93020` |

### Adding a New Theme

1. Add an entry to `themes` in `src/themes/themes.ts` with Monaco theme data and CSS class.
2. Add the CSS class with variable overrides in `src/App.css`.
3. Add the theme option to the select in `src/components/Settings/SettingsPanel.tsx`.

---

## 15. Build & Distribution

### Development Build

```bash
bun run tauri dev
```

Starts Vite dev server on `localhost:1420` with HMR, and opens the native Tauri window.

### Production Build

```bash
bun run tauri build
```

Output in `src-tauri/target/release/bundle/`:

| Platform | Formats |
|----------|---------|
| macOS | `.dmg`, `.app` |
| Windows | `.msi`, `.exe` (NSIS) |
| Linux | `.deb`, `.AppImage`, `.rpm` |

### CI/CD

The GitHub Actions workflow at `.github/workflows/build.yml` builds for all platforms on manual trigger. It supports an optional release tag to create a draft GitHub Release with all platform artifacts.

### Bundle Configuration

Configured in `src-tauri/tauri.conf.json`:
- **Product name**: julide
- **Identifier**: com.ofek.julide
- **Window**: 1400x900px default, 800x600px minimum
- **Icons**: PNG (32x32, 128x128, 128x128@2x), ICNS, ICO
