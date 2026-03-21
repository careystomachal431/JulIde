import type * as Monaco from "monaco-editor";
import type { LspDiagnostic } from "./LspClient";
import { lspClient } from "./LspClient";

// ── Module-level singletons ───────────────────────────────────────────────────

/** Guard so providers are registered only once per Monaco instance (beforeMount is called on every tab remount). */
let providersRegistered = false;

/** Cached Monaco instance for use in setMonacoMarkers. */
let _monaco: typeof Monaco | null = null;

export function setMonacoInstance(m: typeof Monaco): void {
  _monaco = m;
}

// ── Coordinate conversion helpers ─────────────────────────────────────────────

/** LSP 0-based position → Monaco 1-based IRange start */
function lspRangeToMonaco(
  range: { start: { line: number; character: number }; end: { line: number; character: number } }
): Monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

// ── LSP CompletionItemKind → Monaco CompletionItemKind mapping ────────────────

const LSP_KIND: Record<number, number> = {
  1:  17, // Text
  2:  0,  // Method
  3:  1,  // Function
  4:  3,  // Constructor
  5:  4,  // Field
  6:  5,  // Variable
  7:  6,  // Class
  8:  7,  // Interface
  9:  8,  // Module
  10: 9,  // Property
  11: 10, // Unit
  12: 11, // Value
  13: 12, // Enum
  14: 13, // Keyword
  15: 14, // Snippet
  16: 15, // Color
  17: 16, // File
  18: 17, // Reference
  25: 20, // EnumMember
  26: 21, // Constant
  27: 22, // Struct
};

// ── Severity mapping ──────────────────────────────────────────────────────────

function lspSeverityToMonaco(
  monaco: typeof Monaco,
  severity?: number
): Monaco.MarkerSeverity {
  switch (severity) {
    case 1: return monaco.MarkerSeverity.Error;
    case 2: return monaco.MarkerSeverity.Warning;
    case 3: return monaco.MarkerSeverity.Info;
    case 4: return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Error;
  }
}

// ── Hover content normalization ───────────────────────────────────────────────

function flattenHoverContents(
  contents: string | { kind: string; value: string } | Array<string | { language: string; value: string }>
): string {
  if (typeof contents === "string") return contents;
  if (Array.isArray(contents)) {
    return contents
      .map((c) => {
        if (typeof c === "string") return c;
        if ("value" in c) return c.value;
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return (contents as { value: string }).value ?? "";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register all Julia LSP Monaco providers.
 * Called from MonacoEditor's beforeMount — guarded so it only runs once.
 */
export function registerJuliaLspProviders(monaco: typeof Monaco): void {
  if (providersRegistered) return;
  providersRegistered = true;

  // ── Completions ──────────────────────────────────────────────────────────────
  monaco.languages.registerCompletionItemProvider("julia", {
    triggerCharacters: [".", "(", ",", " "],
    provideCompletionItems: async (model, position) => {
      const uri = `file://${model.uri.path}`;
      try {
        const items = await lspClient.getCompletions(
          uri,
          position.lineNumber - 1,
          position.column - 1
        );
        const word = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: items.map((item) => ({
            label: item.label,
            kind:
              LSP_KIND[item.kind ?? 1] ??
              monaco.languages.CompletionItemKind.Text,
            detail: item.detail,
            documentation:
              typeof item.documentation === "object"
                ? { value: item.documentation.value }
                : item.documentation
                ? { value: item.documentation }
                : undefined,
            insertText: item.insertText ?? item.label,
            insertTextRules:
              item.insertTextFormat === 2
                ? monaco.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet
                : undefined,
            range,
          })),
        };
      } catch {
        return { suggestions: [] };
      }
    },
  });

  // ── Hover ────────────────────────────────────────────────────────────────────
  monaco.languages.registerHoverProvider("julia", {
    provideHover: async (model, position) => {
      const uri = `file://${model.uri.path}`;
      try {
        const hover = await lspClient.getHover(
          uri,
          position.lineNumber - 1,
          position.column - 1
        );
        if (!hover) return null;
        return {
          contents: [{ value: flattenHoverContents(hover.contents) }],
          range: hover.range ? lspRangeToMonaco(hover.range) : undefined,
        };
      } catch {
        return null;
      }
    },
  });

  // ── Go to Definition ─────────────────────────────────────────────────────────
  monaco.languages.registerDefinitionProvider("julia", {
    provideDefinition: async (model, position) => {
      const uri = `file://${model.uri.path}`;
      try {
        const locations = await lspClient.getDefinition(
          uri,
          position.lineNumber - 1,
          position.column - 1
        );
        return locations.map((loc) => ({
          uri: monaco.Uri.parse(loc.uri),
          range: lspRangeToMonaco(loc.range),
        }));
      } catch {
        return [];
      }
    },
  });

  // ── Signature Help ───────────────────────────────────────────────────────────
  monaco.languages.registerSignatureHelpProvider("julia", {
    signatureHelpTriggerCharacters: ["(", ","],
    signatureHelpRetriggerCharacters: [","],
    provideSignatureHelp: async (model, position) => {
      const uri = `file://${model.uri.path}`;
      try {
        const help = await lspClient.getSignatureHelp(
          uri,
          position.lineNumber - 1,
          position.column - 1
        );
        if (!help) return null;
        return {
          value: {
            signatures: help.signatures.map((sig) => ({
              label: sig.label,
              documentation:
                sig.documentation == null
                  ? undefined
                  : typeof sig.documentation === "object"
                  ? { value: sig.documentation.value }
                  : { value: sig.documentation },
              parameters: (sig.parameters ?? []).map((p) => ({
                label: p.label,
                documentation:
                  p.documentation == null
                    ? undefined
                    : typeof p.documentation === "object"
                    ? { value: p.documentation.value }
                    : { value: p.documentation },
              })),
            })),
            activeSignature: help.activeSignature ?? 0,
            activeParameter: help.activeParameter ?? 0,
          },
          dispose: () => {},
        };
      } catch {
        return null;
      }
    },
  });
}

/**
 * Apply LSP diagnostics as Monaco model markers (inline squiggles).
 * Models persist across tab switches so markers survive remounts.
 */
export function setMonacoMarkers(uri: string, diagnostics: LspDiagnostic[]): void {
  if (!_monaco) return;
  const model = _monaco.editor.getModel(_monaco.Uri.parse(uri));
  if (!model) return;
  _monaco.editor.setModelMarkers(
    model,
    "lsp",
    diagnostics.map((d) => ({
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      message: d.message,
      severity: lspSeverityToMonaco(_monaco!, d.severity),
      source: d.source ?? "LanguageServer.jl",
    }))
  );
}
