import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface StopEmulatorArgs {
  deviceId: string;
}

export async function stopEmulator(args: StopEmulatorArgs, env: Environment) {
  const result = await executeCommand(env.adbPath, ["-s", args.deviceId, "emu", "kill"], {
    timeout: 15_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to stop emulator ${args.deviceId}.\n\n${result.stderr}`);
  }

  return textResponse(`Emulator ${args.deviceId} stopped.\n\n${result.stdout}`);
}
