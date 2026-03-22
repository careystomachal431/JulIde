import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerBuiltinContributions } from "./services/builtinContributions";
import { pluginHost } from "./services/pluginHost";

// Register all built-in commands, panels, and UI contributions, then load plugins
registerBuiltinContributions().then(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Discover and activate plugins after the UI is rendered
  pluginHost.discoverAndLoadAll().catch(console.warn);
});
