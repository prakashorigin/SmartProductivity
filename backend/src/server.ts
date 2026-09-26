import app from "./app.js";
import { env, assertRequiredEnvironment } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

const startServer = async (): Promise<void> => {
  assertRequiredEnvironment();
  await connectDatabase();

  const server = app.listen(env.port, () => {
    console.log(`SmartProductivity API listening on http://localhost:${env.port}`);
    console.log(`Health check: http://localhost:${env.port}/health`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; closing the API server.`);
    server.close((error) => {
      void disconnectDatabase().finally(() => {
        if (error) {
          console.error("HTTP server shutdown failed.");
          process.exitCode = 1;
        }
      });
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
};

void startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`API startup failed: ${message}`);
  process.exitCode = 1;
});
