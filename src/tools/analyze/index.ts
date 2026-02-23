import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { apkAnalyze } from "./apk-analyze.js";
import { apkPermissions } from "./apk-permissions.js";

export function registerAnalyzeTools(server: McpServer, env: Environment): void {
  server.tool(
    "apk_analyze",
    "Analyze an APK file: size, version, SDK targets, DEX references, and optionally full file listing and manifest",
    {
      apkPath: z.string().describe("Absolute path to the APK file"),
      detail: z
        .enum(["summary", "full"])
        .default("summary")
        .describe(
          "Level of detail: 'summary' for key metrics, 'full' for complete file listing and manifest",
        ),
    },
    withErrorHandling(async (args) => apkAnalyze(args, env)),
  );

  server.tool(
    "apk_permissions",
    "List all permissions declared in an APK file",
    {
      apkPath: z.string().describe("Absolute path to the APK file"),
    },
    withErrorHandling(async (args) => apkPermissions(args, env)),
  );
}
