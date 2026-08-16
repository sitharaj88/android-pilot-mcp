import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";
import { validateDeviceId } from "../../utils/validation.js";
import { DebugToolExtra } from "./types.js";

interface LogcatClearArgs {
  deviceId?: string;
}

export async function logcatClear(args: LogcatClearArgs, env: Environment, extra?: DebugToolExtra) {
  if (args.deviceId) validateDeviceId(args.deviceId);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("logcat", "-c");

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to clear logcat.\n\n${result.stderr}`);
  }

  return textResponse("Logcat buffer cleared.");
}
