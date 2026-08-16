import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";
import {
  validateIntentAction,
  validateComponent,
  validateExtras,
  validateFlag,
  validateDeeplinkUri,
  shellQuoteForDevice,
} from "./validation.js";
import type { IntentToolExtra } from "./types.js";

interface IntentSendArgs {
  action: string;
  data?: string;
  component?: string;
  extras?: Record<string, string>;
  flags?: string[];
  deviceId?: string;
}

export async function intentSend(args: IntentSendArgs, env: Environment, extra?: IntentToolExtra) {
  validateIntentAction(args.action);
  if (args.data) validateDeeplinkUri(args.data);
  if (args.component) validateComponent(args.component);
  if (args.extras) validateExtras(args.extras);
  if (args.flags) args.flags.forEach(validateFlag);
  if (args.deviceId) validateDeviceId(args.deviceId);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "am", "start", "-a", args.action);

  if (args.data) adbArgs.push("-d", shellQuoteForDevice(args.data));
  if (args.component) adbArgs.push("-n", args.component);

  if (args.extras) {
    for (const [key, value] of Object.entries(args.extras)) {
      adbArgs.push("--es", key, shellQuoteForDevice(value));
    }
  }

  if (args.flags) {
    for (const flag of args.flags) {
      adbArgs.push("-f", flag);
    }
  }

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to send intent.\n\n${result.stderr}`);
  }

  return textResponse(`Intent sent: ${args.action}\n\n${result.stdout}`);
}
