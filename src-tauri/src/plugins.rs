use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub display_name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    pub main: String,
    #[serde(default)]
    pub activation_events: Vec<String>,
}

fn plugins_dir() -> PathBuf {
    let home = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".julide").join("plugins")
}

#[tauri::command]
pub fn plugin_get_dir() -> String {
    let dir = plugins_dir();
    // Create if it doesn't exist
    std::fs::create_dir_all(&dir).ok();
    dir.to_string_lossy().to_string()
}

#[tauri::command]
pub fn plugin_scan() -> Result<Vec<PluginManifest>, String> {
    let dir = plugins_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir).ok();
        return Ok(Vec::new());
    }

    let mut manifests = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let manifest_path = path.join("plugin.json");
        if !manifest_path.exists() {
            continue;
        }

        match std::fs::read_to_string(&manifest_path) {
            Ok(content) => match serde_json::from_str::<PluginManifest>(&content) {
                Ok(manifest) => manifests.push(manifest),
                Err(e) => eprintln!("Failed to parse {}: {}", manifest_path.display(), e),
            },
            Err(e) => eprintln!("Failed to read {}: {}", manifest_path.display(), e),
        }
    }
    Ok(manifests)
}

#[tauri::command]
pub fn plugin_read_entry(plugin_name: String) -> Result<String, String> {
    let dir = plugins_dir();
    let manifest_path = dir.join(&plugin_name).join("plugin.json");
    let content = std::fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: PluginManifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let entry_path = dir.join(&plugin_name).join(&manifest.main);
    std::fs::read_to_string(&entry_path).map_err(|e| {
        format!(
            "Failed to read plugin entry {}: {}",
            entry_path.display(),
            e
        )
    })
}
