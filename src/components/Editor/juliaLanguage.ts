import type * as Monaco from "monaco-editor";

export function registerJuliaLanguage(monaco: typeof Monaco) {
  monaco.languages.register({ id: "julia" });

  monaco.languages.setMonarchTokensProvider("julia", {
    keywords: [
      "function", "end", "if", "elseif", "else", "for", "while", "return",
      "struct", "mutable", "abstract", "module", "using", "import", "export",
      "macro", "quote", "begin", "let", "try", "catch", "finally", "throw",
      "local", "global", "const", "do", "in", "isa", "baremodule", "primitive",
      "type", "where", "new", "true", "false", "nothing", "missing", "Inf",
      "NaN", "break", "continue", "typeof", "sizeof",
    ],
    typeKeywords: [
      "Int", "Int8", "Int16", "Int32", "Int64", "Int128",
      "UInt", "UInt8", "UInt16", "UInt32", "UInt64", "UInt128",
      "Float16", "Float32", "Float64", "Bool", "Char", "String",
      "Symbol", "Any", "Nothing", "Missing", "Complex", "Rational",
      "AbstractArray", "AbstractVector", "AbstractMatrix",
      "Vector", "Matrix", "Array", "Tuple", "Dict", "Set",
      "Function", "DataType", "UnionAll", "Union",
    ],
    operators: [
      "=", "+=", "-=", "*=", "/=", "//=", "^=", "%=", "&=", "|=", "⊻=",
      "->", "=>", "|>", "||", "&&", "!", "!=", "!==", "==", "===",
      "<", ">", "<=", ">=", "+", "-", "*", "/", "//", "^", "%",
      "&", "|", "~", "<<", ">>", ">>>", ":", "::", "...", ".",
    ],
    tokenizer: {
      root: [
        // Block comment
        [/#=/, "comment", "@blockComment"],
        // Line comment
        [/#.*$/, "comment"],
        // Strings
        [/"/, "string", "@dqstring"],
        [/`/, "string", "@backtickstring"],
        // Triple-quoted strings
        [/"""/, "string", "@triplestring"],
        // Character literal
        [/'(?:[^'\\]|\\.)+'/, "string.char"],
        // Macros
        [/@[a-zA-Z_]\w*/, "annotation"],
        // Numbers
        [/0x[0-9a-fA-F_]+/, "number.hex"],
        [/0b[01_]+/, "number.binary"],
        [/0o[0-7_]+/, "number.octal"],
        [/\d[\d_]*\.[\d_]*(?:[eE][+-]?\d+)?(?:im)?/, "number.float"],
        [/\d[\d_]*(?:[eE][+-]?\d+)?(?:im)?/, "number"],
        // Symbol literals
        [/:[a-zA-Z_]\w*/, "string.symbol"],
        // Type annotations and parametric types
        [/::/, "keyword.operator"],
        // Operators
        [/[+\-*\/^%&|~<>=!]+/, "operator"],
        // Identifiers
        [
          /[a-zA-Z_\u00A1-\uFFFF][a-zA-Z0-9_\u00A1-\uFFFF]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "type.identifier",
              "@default": "identifier",
            },
          },
        ],
        // Punctuation
        [/[{}()\[\]]/, "@brackets"],
        [/[,;.]/, "delimiter"],
        // Whitespace
        [/\s+/, "white"],
      ],
      blockComment: [
        [/=#/, "comment", "@pop"],
        [/#=/, "comment", "@push"],
        [/./, "comment"],
      ],
      dqstring: [
        [/\$\(/, "string.escape", "@interpolation"],
        [/\$[a-zA-Z_]\w*/, "string.escape"],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"],
        [/./, "string"],
      ],
      triplestring: [
        [/"""/, "string", "@pop"],
        [/\$\(/, "string.escape", "@interpolation"],
        [/\$[a-zA-Z_]\w*/, "string.escape"],
        [/./, "string"],
      ],
      backtickstring: [
        [/`/, "string", "@pop"],
        [/\$[a-zA-Z_]\w*/, "string.escape"],
        [/./, "string"],
      ],
      interpolation: [
        [/\)/, "string.escape", "@pop"],
        { include: "root" },
      ],
    },
  } as Monaco.languages.IMonarchLanguage);

  monaco.languages.setLanguageConfiguration("julia", {
    comments: {
      lineComment: "#",
      blockComment: ["#=", "=#"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
      ["begin", "end"],
      ["function", "end"],
      ["if", "end"],
      ["for", "end"],
      ["while", "end"],
      ["struct", "end"],
      ["module", "end"],
      ["macro", "end"],
      ["do", "end"],
      ["let", "end"],
      ["try", "end"],
      ["quote", "end"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "`", close: "`", notIn: ["string"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "`", close: "`" },
    ],
    indentationRules: {
      increaseIndentPattern:
        /^\s*(function|if|elseif|else|for|while|begin|let|try|catch|finally|struct|mutable\s+struct|module|baremodule|macro|quote|do)\b.*$/,
      decreaseIndentPattern: /^\s*(end|elseif|else|catch|finally)\b/,
    },
    folding: {
      markers: {
        start: /^\s*(#\s*region\b|#=)/,
        end: /^\s*(#\s*endregion\b|=#)/,
      },
    },
  });

  // Basic Julia completions for keywords
  monaco.languages.registerCompletionItemProvider("julia", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = [
        {
          label: "function",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "function ${1:name}(${2:args})\n\t${3:body}\nend",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a function",
          range,
        },
        {
          label: "struct",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "struct ${1:Name}\n\t${2:field}::${3:Type}\nend",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a struct",
          range,
        },
        {
          label: "for",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "for ${1:i} in ${2:iterable}\n\t${3:body}\nend",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "For loop",
          range,
        },
        {
          label: "if",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "if ${1:condition}\n\t${2:body}\nend",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "If statement",
          range,
        },
        {
          label: "while",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "while ${1:condition}\n\t${2:body}\nend",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "While loop",
          range,
        },
        {
          label: "module",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "module ${1:Name}\n\t${2:body}\nend",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a module",
          range,
        },
        {
          label: "println",
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'println(${1:args})',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Print with newline",
          range,
        },
      ];

      return { suggestions };
    },
  });
}
