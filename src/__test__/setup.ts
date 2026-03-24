/**
 * Global test setup — preloaded by Bun test runner via bunfig.toml.
 * Mocks all Tauri API modules so tests can run without a Tauri runtime.
 */
import { mock } from "bun:test";
import { mockInvoke, mockListen } from "./tauriMock";

// Mock @tauri-apps/api/core
mock.module("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

// Mock @tauri-apps/api/event
mock.module("@tauri-apps/api/event", () => ({
  listen: mockListen,
  emit: async () => {},
  once: async () => () => {},
}));

// Mock Tauri plugins (used in some components)
mock.module("@tauri-apps/plugin-dialog", () => ({
  open: async () => null,
  save: async () => null,
  message: async () => {},
  ask: async () => false,
  confirm: async () => false,
}));

mock.module("@tauri-apps/plugin-fs", () => ({
  readTextFile: async () => "",
  writeTextFile: async () => {},
  exists: async () => false,
}));

mock.module("@tauri-apps/plugin-shell", () => ({
  Command: class {
    static sidecar() { return new this(); }
    async execute() { return { code: 0, stdout: "", stderr: "" }; }
  },
}));

mock.module("@tauri-apps/plugin-opener", () => ({
  open: async () => {},
}));
