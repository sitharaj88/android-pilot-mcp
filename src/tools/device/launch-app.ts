import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName, validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

interface LaunchAppArgs {
  packageName: string;
  activityName?: string;
  deviceId?: string;
}

export async function launchApp(
  args: LaunchAppArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const packageName = validatePackageName(args.packageName);
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;

  const adbArgs: string[] = [];
  if (deviceId) adbArgs.push("-s", deviceId);

  if (args.activityName) {
    adbArgs.push("shell", "am", "start", "-n", `${packageName}/${args.activityName}`);
  } else {
    adbArgs.push(
      "shell",
      "monkey",
      "-p",
      packageName,
      "-c",
      "android.intent.category.LAUNCHER",
      "1",
    );
  }

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to launch ${packageName}.\n\n${result.stderr}`);
  }

  return textResponse(`Launched ${packageName}.\n\n${result.stdout}`);
}
