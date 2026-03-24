import { describe, expect, test, beforeEach } from "bun:test";
import { useSettingsStore } from "./useSettingsStore";
import { resetAllStores } from "../__test__/storeTestUtils";
import { invokeHandlers } from "../__test__/tauriMock";

beforeEach(() => {
  resetAllStores();
});

describe("initial state", () => {
  test("has correct defaults", () => {
    const { settings } = useSettingsStore.getState();
    expect(settings.fontSize).toBe(14);
    expect(settings.tabSize).toBe(4);
    expect(settings.theme).toBe("julide-dark");
    expect(settings.minimapEnabled).toBe(true);
    expect(settings.wordWrap).toBe("off");
    expect(settings.autoSave).toBe(true);
    expect(settings.terminalFontSize).toBe(13);
    expect(settings.containerRuntime).toBe("auto");
    expect(settings.plutoPort).toBe(3000);
    expect(settings.recentWorkspaces).toEqual([]);
  });

  test("loaded is false initially", () => {
    expect(useSettingsStore.getState().loaded).toBe(false);
  });
});

describe("loadSettings", () => {
  test("merges partial response from invoke", async () => {
    invokeHandlers.set("settings_load", () => ({
      fontSize: 18,
      theme: "julide-light",
    }));

    await useSettingsStore.getState().loadSettings();

    const { settings, loaded } = useSettingsStore.getState();
    expect(loaded).toBe(true);
    expect(settings.fontSize).toBe(18);
    expect(settings.theme).toBe("julide-light");
    // Unset fields keep defaults
    expect(settings.tabSize).toBe(4);
    expect(settings.minimapEnabled).toBe(true);
  });

  test("on failure, sets loaded but keeps defaults", async () => {
    invokeHandlers.set("settings_load", () => {
      throw new Error("disk error");
    });

    await useSettingsStore.getState().loadSettings();

    const { settings, loaded } = useSettingsStore.getState();
    expect(loaded).toBe(true);
    expect(settings.fontSize).toBe(14); // default
  });
});

describe("updateSettings", () => {
  test("updates in-memory settings and calls settings_save", async () => {
    let savedSettings: any = null;
    invokeHandlers.set("settings_save", (args: any) => {
      savedSettings = args?.settings;
    });

    await useSettingsStore.getState().updateSettings({ fontSize: 20 });

    expect(useSettingsStore.getState().settings.fontSize).toBe(20);
    expect(savedSettings).toBeDefined();
    expect(savedSettings.fontSize).toBe(20);
  });
});

describe("setSettingsOpen", () => {
  test("toggles settingsOpen", () => {
    useSettingsStore.getState().setSettingsOpen(true);
    expect(useSettingsStore.getState().settingsOpen).toBe(true);

    useSettingsStore.getState().setSettingsOpen(false);
    expect(useSettingsStore.getState().settingsOpen).toBe(false);
  });
});
