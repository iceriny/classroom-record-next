import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        if (registration.waiting) {
          window.dispatchEvent(
            new CustomEvent("pwa:update-available", {
              detail: registration,
            }),
          );
        }

        registration.addEventListener("updatefound", () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;

          nextWorker.addEventListener("statechange", () => {
            if (
              nextWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(
                new CustomEvent("pwa:update-available", {
                  detail: registration,
                }),
              );
            }
          });
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.dispatchEvent(new Event("pwa:update-activated"));
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
