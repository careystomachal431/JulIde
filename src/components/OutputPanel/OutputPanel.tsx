import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { Trash2 } from "lucide-react";
import { useIdeStore } from "../../stores/useIdeStore";
import type { JuliaOutputEvent } from "../../types";

export function OutputPanel() {
  const output = useIdeStore((s) => s.output);
  const clearOutput = useIdeStore((s) => s.clearOutput);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Listen for Julia output events — one listener at a time
  useEffect(() => {
    let active = true;

    listen<JuliaOutputEvent>("julia-output", (event) => {
      if (!active) return;
      const { kind, text, exit_code } = event.payload;
      const store = useIdeStore.getState();
      if (kind === "done") {
        store.setIsRunning(false);
        store.appendOutput({ kind: "info", text: `Process exited with code ${exit_code ?? -1}` });
      } else if (kind === "stdout") {
        store.appendOutput({ kind: "stdout", text });
      } else if (kind === "stderr") {
        store.appendOutput({ kind: "stderr", text });
      }
    }).then((unlisten) => {
      // If cleanup already ran (StrictMode fast unmount), unlisten immediately
      if (!active) unlisten();
      else (activeUnlisten = unlisten);
    });

    let activeUnlisten: (() => void) | null = null;
    return () => {
      active = false;
      activeUnlisten?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  const parseErrors = (text: string) => {
    // Basic Julia error pattern: "ERROR: LoadError: ... at file.jl:10"
    const errorPattern = /ERROR:|Error|error/;
    if (errorPattern.test(text)) {
      // Could parse and add to problems panel — simplified for now
    }
  };

  return (
    <div className="output-panel">
      <div className="output-toolbar">
        <button
          className="output-clear-btn"
          onClick={clearOutput}
          title="Clear output"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="output-content">
        {output.map((line) => (
          <div
            key={line.id}
            className={`output-line output-${line.kind}`}
          >
            <span className="output-text">{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
