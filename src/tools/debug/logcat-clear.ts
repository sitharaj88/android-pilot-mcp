import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface LogcatClearArgs {
  deviceId?: string;
}

export async function logcatClear(args: LogcatClearArgs, env: Environment) {
  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("logcat", "-c");

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to clear logcat.\n\n${result.stderr}`);
  }

  return textResponse("Logcat buffer cleared.");
}
