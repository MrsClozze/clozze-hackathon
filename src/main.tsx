import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { IntegrationsProvider } from "./contexts/IntegrationsContext";

createRoot(document.getElementById("root")!).render(
  <IntegrationsProvider>
    <App />
  </IntegrationsProvider>
);
