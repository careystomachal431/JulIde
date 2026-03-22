import { invoke } from "@tauri-apps/api/core";
import { createPluginContext } from "./pluginContext";
import { useIdeStore } from "../stores/useIdeStore";
import type { PluginManifest, PluginContext } from "../types/plugin";

interface LoadedPlugin {
  manifest: PluginManifest;
  context: PluginContext;
  disposeAll: () => void;
  module: { activate?: (ctx: PluginContext) => void | Promise<void>; deactivate?: () => void | Promise<void> };
  active: boolean;
  error?: string;
}

class PluginHost {
  private plugins = new Map<string, LoadedPlugin>();

  async discoverAndLoadAll(): Promise<void> {
    try {
      const manifests = await invoke<PluginManifest[]>("plugin_scan");
      for (const manifest of manifests) {
        if (this.plugins.has(manifest.name)) continue;

        // Only auto-activate plugins with "*" or empty activation events
        const shouldActivate =
          !manifest.activationEvents ||
          manifest.activationEvents.length === 0 ||
          manifest.activationEvents.includes("*");

        if (shouldActivate) {
          await this.activatePlugin(manifest);
        }
      }
    } catch (e) {
      console.warn("Plugin discovery failed:", e);
    }
  }

  async activatePlugin(manifest: PluginManifest): Promise<void> {
    const { context, disposeAll } = createPluginContext(manifest.name);

    try {
      // Read the plugin's entry JS file
      const source = await invoke<string>("plugin_read_entry", {
        pluginName: manifest.name,
      });

      // Create a module from the source code using a blob URL
      const blob = new Blob([source], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);

      let module: LoadedPlugin["module"];
      try {
        module = await import(/* @vite-ignore */ blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      const loaded: LoadedPlugin = {
        manifest,
        context,
        disposeAll,
        module,
        active: false,
      };

      this.plugins.set(manifest.name, loaded);

      // Call activate if exported
      if (typeof module.activate === "function") {
        await module.activate(context);
      }

      loaded.active = true;
      console.log(`Plugin activated: ${manifest.displayName} v${manifest.version}`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`Failed to activate plugin ${manifest.name}:`, errorMsg);
      useIdeStore.getState().appendOutput({
        kind: "stderr",
        text: `Plugin "${manifest.displayName}" failed to activate: ${errorMsg}`,
      });

      this.plugins.set(manifest.name, {
        manifest,
        context,
        disposeAll,
        module: {},
        active: false,
        error: errorMsg,
      });
    }
  }

  async deactivatePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    try {
      if (plugin.active && typeof plugin.module.deactivate === "function") {
        await plugin.module.deactivate();
      }
    } catch (e) {
      console.error(`Error deactivating plugin ${name}:`, e);
    }

    plugin.disposeAll();
    plugin.active = false;
  }

  async deactivateAll(): Promise<void> {
    for (const name of this.plugins.keys()) {
      await this.deactivatePlugin(name);
    }
  }

  getPlugins(): Array<{ name: string; displayName: string; version: string; active: boolean; error?: string }> {
    return Array.from(this.plugins.values()).map((p) => ({
      name: p.manifest.name,
      displayName: p.manifest.displayName,
      version: p.manifest.version,
      active: p.active,
      error: p.error,
    }));
  }

  isActive(name: string): boolean {
    return this.plugins.get(name)?.active ?? false;
  }
}

// Singleton instance
export const pluginHost = new PluginHost();
