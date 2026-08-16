import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

interface StopEmulatorArgs {
  deviceId: string;
}

export async function stopEmulator(
  args: StopEmulatorArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const deviceId = validateDeviceId(args.deviceId);

  const result = await executeCommand(env.adbPath, ["-s", deviceId, "emu", "kill"], {
    timeout: 15_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to stop emulator ${deviceId}.\n\n${result.stderr}`);
  }

  return textResponse(`Emulator ${deviceId} stopped.\n\n${result.stdout}`);
}
