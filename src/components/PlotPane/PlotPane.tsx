import { useState, useEffect, useRef } from "react";
import { Trash2, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useIdeStore } from "../../stores/useIdeStore";

interface PlotEntry {
  id: string;
  type: string;
  data: string;
  timestamp: number;
}

export function PlotPane() {
  const output = useIdeStore((s) => s.output);
  const [plots, setPlots] = useState<PlotEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract plots from output (any MIME output with image/svg/html)
  useEffect(() => {
    const plotLines = output.filter(
      (line) =>
        line.mime &&
        (line.mime.type === "image/png" ||
          line.mime.type === "image/jpeg" ||
          line.mime.type === "image/gif" ||
          line.mime.type === "image/svg+xml" ||
          line.mime.type === "text/html")
    );
    const newPlots: PlotEntry[] = plotLines.map((line) => ({
      id: line.id,
      type: line.mime!.type,
      data: line.mime!.data,
      timestamp: line.timestamp,
    }));

    setPlots(newPlots);
    // Auto-navigate to latest plot
    if (newPlots.length > plots.length) {
      setCurrentIndex(newPlots.length - 1);
    }
  }, [output]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearPlots = () => {
    setPlots([]);
    setCurrentIndex(0);
  };

  const goPrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const goNext = () => setCurrentIndex(Math.min(plots.length - 1, currentIndex + 1));

  const currentPlot = plots[currentIndex];

  return (
    <div className={`plot-pane ${expanded ? "plot-pane-expanded" : ""}`}>
      <div className="plot-pane-toolbar">
        <span className="plot-pane-title">Plots</span>
        {plots.length > 0 && (
          <span className="plot-pane-counter">
            {currentIndex + 1} / {plots.length}
          </span>
        )}
        <div className="plot-pane-actions">
          <button
            className="plot-pane-btn"
            onClick={goPrev}
            disabled={currentIndex <= 0}
            title="Previous plot"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className="plot-pane-btn"
            onClick={goNext}
            disabled={currentIndex >= plots.length - 1}
            title="Next plot"
          >
            <ChevronRight size={14} />
          </button>
          <button
            className="plot-pane-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Minimize" : "Maximize"}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            className="plot-pane-btn"
            onClick={clearPlots}
            title="Clear plots"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="plot-pane-content" ref={containerRef}>
        {plots.length === 0 ? (
          <div className="plot-pane-empty">
            <p>No plots yet</p>
            <p className="plot-pane-hint">Run Julia code that generates plots (Plots.jl, Makie.jl, etc.)</p>
          </div>
        ) : currentPlot ? (
          <div className="plot-pane-display">
            {(currentPlot.type === "image/png" ||
              currentPlot.type === "image/jpeg" ||
              currentPlot.type === "image/gif") && (
              <img
                src={`data:${currentPlot.type};base64,${currentPlot.data}`}
                className="plot-pane-image"
                alt={`Plot ${currentIndex + 1}`}
              />
            )}
            {currentPlot.type === "image/svg+xml" && (
              <img
                src={`data:image/svg+xml;base64,${currentPlot.data}`}
                className="plot-pane-image"
                alt={`SVG Plot ${currentIndex + 1}`}
              />
            )}
            {currentPlot.type === "text/html" && (
              <iframe
                srcDoc={atob(currentPlot.data)}
                className="plot-pane-iframe"
                sandbox="allow-scripts"
                title={`HTML Plot ${currentIndex + 1}`}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
