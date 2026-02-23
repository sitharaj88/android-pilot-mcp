import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface LaunchAppArgs {
  packageName: string;
  activityName?: string;
  deviceId?: string;
}

export async function launchApp(args: LaunchAppArgs, env: Environment) {
  const packageName = validatePackageName(args.packageName);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);

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
  });

  if (!result.success) {
    return errorResponse(`Failed to launch ${packageName}.\n\n${result.stderr}`);
  }

  return textResponse(`Launched ${packageName}.\n\n${result.stdout}`);
}
