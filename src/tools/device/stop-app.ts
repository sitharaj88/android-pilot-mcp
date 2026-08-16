import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName, validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

interface StopAppArgs {
  packageName: string;
  deviceId?: string;
}

export async function stopApp(
  args: StopAppArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const packageName = validatePackageName(args.packageName);
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;

  const adbArgs: string[] = [];
  if (deviceId) adbArgs.push("-s", deviceId);
  adbArgs.push("shell", "am", "force-stop", packageName);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to stop ${packageName}.\n\n${result.stderr}`);
  }

  return textResponse(`Force-stopped ${packageName}.`);
}
