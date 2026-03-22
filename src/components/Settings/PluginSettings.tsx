import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { pluginHost } from "../../services/pluginHost";
import { FolderOpen, Check, X, AlertCircle } from "lucide-react";

export function PluginSettings() {
  const [pluginsDir, setPluginsDir] = useState("");
  const plugins = pluginHost.getPlugins();

  useEffect(() => {
    invoke<string>("plugin_get_dir").then(setPluginsDir).catch(() => {});
  }, []);

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Extensions</h3>

      <div className="settings-row">
        <label className="settings-label">Plugins directory</label>
        <div className="settings-value" style={{ fontSize: "12px", opacity: 0.7 }}>
          <FolderOpen size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          {pluginsDir || "~/.julide/plugins/"}
        </div>
      </div>

      {plugins.length === 0 ? (
        <div className="settings-row" style={{ opacity: 0.5 }}>
          No plugins installed. Place plugin folders in the plugins directory above.
        </div>
      ) : (
        <div className="settings-plugins-list">
          {plugins.map((plugin) => (
            <div key={plugin.name} className="settings-plugin-item">
              <div className="settings-plugin-info">
                <span className="settings-plugin-name">{plugin.displayName}</span>
                <span className="settings-plugin-version">v{plugin.version}</span>
              </div>
              <div className="settings-plugin-status">
                {plugin.error ? (
                  <span className="settings-plugin-error" title={plugin.error}>
                    <AlertCircle size={13} /> Error
                  </span>
                ) : plugin.active ? (
                  <span className="settings-plugin-active">
                    <Check size={13} /> Active
                  </span>
                ) : (
                  <span className="settings-plugin-inactive">
                    <X size={13} /> Inactive
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
