import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface IntentSendArgs {
  action: string;
  data?: string;
  component?: string;
  extras?: Record<string, string>;
  flags?: string[];
  deviceId?: string;
}

export async function intentSend(args: IntentSendArgs, env: Environment) {
  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "am", "start", "-a", args.action);

  if (args.data) adbArgs.push("-d", args.data);
  if (args.component) adbArgs.push("-n", args.component);

  if (args.extras) {
    for (const [key, value] of Object.entries(args.extras)) {
      adbArgs.push("--es", key, value);
    }
  }

  if (args.flags) {
    for (const flag of args.flags) {
      adbArgs.push("-f", flag);
    }
  }

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to send intent.\n\n${result.stderr}`);
  }

  return textResponse(`Intent sent: ${args.action}\n\n${result.stdout}`);
}
