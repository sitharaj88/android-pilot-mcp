import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName, validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import { confirmDestructiveAction } from "./elicit.js";
import type { ToolExtra } from "./types.js";

interface AppClearDataArgs {
  packageName: string;
  deviceId?: string;
}

export async function appClearData(
  args: AppClearDataArgs,
  env: Environment,
  server: McpServer,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const packageName = validatePackageName(args.packageName);
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;

  const confirmed = await confirmDestructiveAction(
    server,
    `This will permanently erase all data for "${packageName}". Continue?`,
  );
  if (!confirmed) {
    return errorResponse(`Clear data for ${packageName} cancelled by user.`);
  }

  const adbArgs: string[] = [];
  if (deviceId) adbArgs.push("-s", deviceId);
  adbArgs.push("shell", "pm", "clear", packageName);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
    signal: extra?.signal,
  });

  if (!result.success || result.stdout.trim() === "Failed") {
    return errorResponse(
      `Failed to clear data for ${packageName}.\n\n${result.stdout}\n${result.stderr}`,
    );
  }

  return textResponse(`App data cleared for ${packageName}.`);
}
