import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface BroadcastSendArgs {
  action: string;
  component?: string;
  extras?: Record<string, string>;
  deviceId?: string;
}

export async function broadcastSend(args: BroadcastSendArgs, env: Environment) {
  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "am", "broadcast", "-a", args.action);

  if (args.component) adbArgs.push("-n", args.component);

  if (args.extras) {
    for (const [key, value] of Object.entries(args.extras)) {
      adbArgs.push("--es", key, value);
    }
  }

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to send broadcast.\n\n${result.stderr}`);
  }

  return textResponse(`Broadcast sent: ${args.action}\n\n${result.stdout}`);
}
