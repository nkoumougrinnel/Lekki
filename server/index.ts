import express from "express";
import { createServer } from "http";
import path from "path";
import { apiRouter } from "./routes.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API v1 routes
  app.use("/api/v1", apiRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Lekki Wiki" });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true, host: "0.0.0.0", port: 3000 },
      appType: "spa",
      root: path.resolve(process.cwd(), "client"),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist", "public");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Lekki Wiki server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Lekki Wiki server:", err);
  process.exit(1);
});
