import React from "react";
import { createRoot } from "react-dom/client";
import { TicketWidget } from "./TicketWidget";

function initWidget() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Prevent duplicate mounts
  if (document.getElementById("itrix-widget-shadow-host")) return;

  // Find script tag to read config dataset attributes
  const scripts = document.querySelectorAll("script");
  let scriptEl: HTMLScriptElement | null = null;

  for (let i = scripts.length - 1; i >= 0; i--) {
    const s = scripts[i];
    if (
      s.getAttribute("data-widget-key") ||
      s.src.includes("widget.js")
    ) {
      scriptEl = s;
      break;
    }
  }

  let scriptOrigin = "";
  if (scriptEl?.src) {
    try {
      const parsedUrl = new URL(scriptEl.src, window.location.href);
      if (parsedUrl.protocol.startsWith("http")) {
        scriptOrigin = parsedUrl.origin;
      }
    } catch {
      // Ignore invalid URL parse
    }
  }

  const widgetKey = scriptEl?.getAttribute("data-widget-key") || "";
  const employeeId = scriptEl?.getAttribute("data-employee-id") || "";
  const employeeEmail = scriptEl?.getAttribute("data-employee-email") || "";
  const signature = scriptEl?.getAttribute("data-signature") || "";
  const bgColor = scriptEl?.getAttribute("data-bg-color") || "#0F172A";
  const fgColor = scriptEl?.getAttribute("data-fg-color") || "#10B981";
  const textColor = scriptEl?.getAttribute("data-text-color") || "#FFFFFF";
  const apiUrl =
    scriptEl?.getAttribute("data-api-url") ||
    scriptOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // Create Shadow Host & Shadow DOM
  const shadowHost = document.createElement("div");
  shadowHost.id = "itrix-widget-shadow-host";
  document.body.appendChild(shadowHost);

  const shadowRoot = shadowHost.attachShadow({ mode: "open" });

  // Create mount point inside Shadow Root
  const container = document.createElement("div");
  shadowRoot.appendChild(container);

  // Mount React Component inside Shadow DOM
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TicketWidget
        widgetKey={widgetKey}
        employee={{
          id: employeeId,
          email: employeeEmail,
          signature: signature,
        }}
        theme={{
          background: bgColor,
          foreground: fgColor,
          text: textColor,
        }}
        apiUrl={apiUrl}
      />
    </React.StrictMode>
  );
}

// Auto-initialize when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
}
