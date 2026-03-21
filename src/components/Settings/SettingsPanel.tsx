import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useSettingsStore } from "../../stores/useSettingsStore";

export function SettingsPanel() {
  const open = useSettingsStore((s) => s.settingsOpen);
  const setOpen = useSettingsStore((s) => s.setSettingsOpen);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
      // Cmd+, to open settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={() => setOpen(false)}>
      <div
        ref={panelRef}
        className="settings-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-body">
          <SettingsSection title="Editor">
            <SettingRow label="Font Size">
              <input
                type="number"
                className="settings-input settings-number"
                value={settings.fontSize}
                min={8}
                max={32}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              />
            </SettingRow>

            <SettingRow label="Font Family">
              <input
                type="text"
                className="settings-input"
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              />
            </SettingRow>

            <SettingRow label="Tab Size">
              <input
                type="number"
                className="settings-input settings-number"
                value={settings.tabSize}
                min={1}
                max={8}
                onChange={(e) => updateSettings({ tabSize: Number(e.target.value) })}
              />
            </SettingRow>

            <SettingRow label="Word Wrap">
              <select
                className="settings-select"
                value={settings.wordWrap}
                onChange={(e) => updateSettings({ wordWrap: e.target.value })}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
                <option value="wordWrapColumn">Word Wrap Column</option>
                <option value="bounded">Bounded</option>
              </select>
            </SettingRow>

            <SettingRow label="Minimap">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.minimapEnabled}
                  onChange={(e) => updateSettings({ minimapEnabled: e.target.checked })}
                />
                <span className="settings-toggle-label">
                  {settings.minimapEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </SettingRow>

            <SettingRow label="Auto Save">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                />
                <span className="settings-toggle-label">
                  {settings.autoSave ? "Enabled" : "Disabled"}
                </span>
              </label>
            </SettingRow>
          </SettingsSection>

          <SettingsSection title="Terminal">
            <SettingRow label="Font Size">
              <input
                type="number"
                className="settings-input settings-number"
                value={settings.terminalFontSize}
                min={8}
                max={28}
                onChange={(e) => updateSettings({ terminalFontSize: Number(e.target.value) })}
              />
            </SettingRow>
          </SettingsSection>

          <SettingsSection title="Appearance">
            <SettingRow label="Theme">
              <select
                className="settings-select"
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
              >
                <option value="julide-dark">JulIDE Dark</option>
                <option value="julide-light">JulIDE Light</option>
              </select>
            </SettingRow>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{title}</h3>
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <label className="settings-label">{label}</label>
      <div className="settings-control">{children}</div>
    </div>
  );
}
