#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { detectEnvironment } from "./environment.js";
import { logger } from "./utils/logger.js";
import { registerBuildTools } from "./tools/build/index.js";
import { registerDeviceTools } from "./tools/device/index.js";
import { registerDebugTools } from "./tools/debug/index.js";
import { registerScaffoldTools } from "./tools/scaffold/index.js";
import { registerAnalyzeTools } from "./tools/analyze/index.js";
import { registerIntentTools } from "./tools/intent/index.js";
import { registerSdkTools } from "./tools/sdk/index.js";

async function main() {
  const env = detectEnvironment();

  const server = new McpServer({
    name: "android-pilot",
    version: "1.0.0",
  });

  registerBuildTools(server, env);
  registerDeviceTools(server, env);
  registerDebugTools(server, env);
  registerScaffoldTools(server, env);
  registerAnalyzeTools(server, env);
  registerIntentTools(server, env);
  registerSdkTools(server, env);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server running on stdio");

  const shutdown = async (signal: string) => {
    logger.info("Shutting down", { signal });
    try {
      await server.close();
      logger.info("Server closed cleanly");
    } catch (err: unknown) {
      logger.error("Error during shutdown", { error: String(err) });
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.stdin.on("close", () => void shutdown("stdin-close"));
}

main().catch((err) => {
  logger.error("Fatal error starting server", { error: String(err) });
  process.exit(1);
});
