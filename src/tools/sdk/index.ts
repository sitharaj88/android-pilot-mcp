import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { sdkList } from "./sdk-list.js";
import { sdkInstall } from "./sdk-install.js";

export function registerSdkTools(server: McpServer, env: Environment): void {
  server.tool(
    "sdk_list",
    "List installed or available Android SDK packages, system images, and build tools",
    {
      installed: z
        .boolean()
        .default(true)
        .describe("If true, show only installed packages. If false, show all available packages"),
    },
    withErrorHandling(async (args) => sdkList(args, env)),
  );

  server.tool(
    "sdk_install",
    "Install Android SDK packages (system images, build tools, platforms, etc.)",
    {
      packages: z
        .array(z.string())
        .describe(
          "Package names to install, e.g. ['platforms;android-35', 'system-images;android-35;google_apis;arm64-v8a']",
        ),
    },
    withErrorHandling(async (args) => sdkInstall(args, env)),
  );
}
