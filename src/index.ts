#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { detectEnvironment, createUnavailableEnvironment } from "./environment.js";
import { logger, setMcpServer } from "./utils/logger.js";
import { Environment } from "./types.js";
import { registerBuildTools } from "./tools/build/index.js";
import { registerDeviceTools } from "./tools/device/index.js";
import { registerDebugTools } from "./tools/debug/index.js";
import { registerScaffoldTools } from "./tools/scaffold/index.js";
import { registerAnalyzeTools } from "./tools/analyze/index.js";
import { registerIntentTools } from "./tools/intent/index.js";
import { registerSdkTools } from "./tools/sdk/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main() {
  let env: Environment;
  try {
    env = detectEnvironment();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      "Android SDK detection failed; tools will report a configuration error until this is fixed",
      {
        error: message,
      },
    );
    env = createUnavailableEnvironment(message);
  }

  const server = new McpServer(
    {
      name: "android-pilot",
      version: readPackageVersion(),
    },
    {
      capabilities: { logging: {} },
    },
  );

  registerBuildTools(server, env);
  registerDeviceTools(server, env);
  registerDebugTools(server, env);
  registerScaffoldTools(server, env);
  registerAnalyzeTools(server, env);
  registerIntentTools(server, env);
  registerSdkTools(server, env);
  registerResources(server, env);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  setMcpServer(server);

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
