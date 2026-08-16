import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { sdkList } from "./sdk-list.js";
import { sdkInstall } from "./sdk-install.js";

export function registerSdkTools(server: McpServer, env: Environment): void {
  server.registerTool(
    "sdk_list",
    {
      title: "List SDK Packages",
      description:
        "List installed or available Android SDK packages, system images, and build tools",
      inputSchema: {
        installed: z
          .boolean()
          .default(true)
          .describe("If true, show only installed packages. If false, show all available packages"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra) => sdkList(args, env, extra)),
  );

  server.registerTool(
    "sdk_install",
    {
      title: "Install SDK Packages",
      description: "Install Android SDK packages (system images, build tools, platforms, etc.)",
      inputSchema: {
        packages: z
          .array(z.string())
          .describe(
            "Package names to install, e.g. ['platforms;android-35', 'system-images;android-35;google_apis;arm64-v8a']",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra) => sdkInstall(args, env, server, extra)),
  );
}
