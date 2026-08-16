import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.ts";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");
createRoot(root).render(<RouterProvider router={router} />);
