import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { apkAnalyze } from "./apk-analyze.js";
import { apkPermissions } from "./apk-permissions.js";

export function registerAnalyzeTools(server: McpServer, env: Environment): void {
  server.registerTool(
    "apk_analyze",
    {
      title: "Analyze APK",
      description:
        "Analyze an APK file: size, version, SDK targets, DEX references, and optionally full file listing and manifest",
      inputSchema: {
        apkPath: z.string().describe("Absolute path to the APK file"),
        detail: z
          .enum(["summary", "full"])
          .default("summary")
          .describe(
            "Level of detail: 'summary' for key metrics, 'full' for complete file listing and manifest",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => apkAnalyze(args, env, extra)),
  );

  server.registerTool(
    "apk_permissions",
    {
      title: "APK Permissions",
      description: "List all permissions declared in an APK file",
      inputSchema: {
        apkPath: z.string().describe("Absolute path to the APK file"),
      },
      outputSchema: {
        permissions: z.array(z.string()).describe("Permissions declared in the APK manifest"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => apkPermissions(args, env, extra)),
  );
}
