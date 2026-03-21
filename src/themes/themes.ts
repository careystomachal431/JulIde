import type * as Monaco from "monaco-editor";

export interface ThemeDefinition {
  id: string;
  label: string;
  monacoTheme: Monaco.editor.IStandaloneThemeData;
  cssClass: string;
  terminalTheme: Record<string, string>;
}

export const themes: Record<string, ThemeDefinition> = {
  "julide-dark": {
    id: "julide-dark",
    label: "JulIDE Dark",
    cssClass: "theme-dark",
    monacoTheme: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "9558B2", fontStyle: "bold" },
        { token: "type.identifier", foreground: "4063D8" },
        { token: "string", foreground: "98c379" },
        { token: "string.symbol", foreground: "e5c07b" },
        { token: "string.char", foreground: "98c379" },
        { token: "string.escape", foreground: "56b6c2" },
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
        { token: "number", foreground: "389826" },
        { token: "number.float", foreground: "389826" },
        { token: "number.hex", foreground: "389826" },
        { token: "annotation", foreground: "CB3C33" },
        { token: "operator", foreground: "56b6c2" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#cccccc",
        "editor.lineHighlightBackground": "#2a2d2e",
        "editor.selectionBackground": "#3a3d41",
        "editorCursor.foreground": "#9558B2",
        "editorGutter.background": "#1e1e1e",
        "editorGlyphMargin.background": "#1e1e1e",
        "editorLineNumber.foreground": "#5a5a5a",
        "editorLineNumber.activeForeground": "#cccccc",
        "editor.inactiveSelectionBackground": "#3a3d41",
      },
    },
    terminalTheme: {
      background: "#1a1a1a",
      foreground: "#cccccc",
      cursor: "#9558B2",
    },
  },
  "julide-light": {
    id: "julide-light",
    label: "JulIDE Light",
    cssClass: "theme-light",
    monacoTheme: {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "7B3F9E", fontStyle: "bold" },
        { token: "type.identifier", foreground: "2D4FA0" },
        { token: "string", foreground: "50A14F" },
        { token: "string.symbol", foreground: "C18401" },
        { token: "string.char", foreground: "50A14F" },
        { token: "string.escape", foreground: "0184BC" },
        { token: "comment", foreground: "A0A1A7", fontStyle: "italic" },
        { token: "number", foreground: "2B7F1C" },
        { token: "number.float", foreground: "2B7F1C" },
        { token: "number.hex", foreground: "2B7F1C" },
        { token: "annotation", foreground: "C93020" },
        { token: "operator", foreground: "0184BC" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#383A42",
        "editor.lineHighlightBackground": "#F2F2F2",
        "editor.selectionBackground": "#B6D6FD",
        "editorCursor.foreground": "#7B3F9E",
        "editorGutter.background": "#ffffff",
        "editorGlyphMargin.background": "#ffffff",
        "editorLineNumber.foreground": "#9D9D9F",
        "editorLineNumber.activeForeground": "#383A42",
        "editor.inactiveSelectionBackground": "#E5EBF1",
      },
    },
    terminalTheme: {
      background: "#ffffff",
      foreground: "#383A42",
      cursor: "#7B3F9E",
    },
  },
};
