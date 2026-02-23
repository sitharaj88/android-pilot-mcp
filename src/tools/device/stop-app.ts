import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface StopAppArgs {
  packageName: string;
  deviceId?: string;
}

export async function stopApp(args: StopAppArgs, env: Environment) {
  const packageName = validatePackageName(args.packageName);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "am", "force-stop", packageName);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to stop ${packageName}.\n\n${result.stderr}`);
  }

  return textResponse(`Force-stopped ${packageName}.`);
}
