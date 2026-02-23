import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface AppClearDataArgs {
  packageName: string;
  deviceId?: string;
}

export async function appClearData(args: AppClearDataArgs, env: Environment) {
  const packageName = validatePackageName(args.packageName);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "pm", "clear", packageName);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
  });

  if (!result.success || result.stdout.trim() === "Failed") {
    return errorResponse(
      `Failed to clear data for ${packageName}.\n\n${result.stdout}\n${result.stderr}`,
    );
  }

  return textResponse(`App data cleared for ${packageName}.`);
}
