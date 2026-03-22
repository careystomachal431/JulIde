import { useEffect, useRef } from "react";
import type { ComponentType } from "react";

interface PluginPanelProps {
  /** React component (built-in or plugin opt-in) */
  component?: ComponentType;
  /** DOM render function (plugin default) */
  render?: (container: HTMLElement) => (() => void) | void;
}

/**
 * Generic wrapper that renders either a React component or a DOM-based plugin panel.
 * Built-in panels use `component`, plugins use `render`.
 */
export function PluginPanel({ component: Component, render }: PluginPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!render || !containerRef.current) return;

    const result = render(containerRef.current);
    if (typeof result === "function") {
      cleanupRef.current = result;
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [render]);

  if (Component) {
    return <Component />;
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
