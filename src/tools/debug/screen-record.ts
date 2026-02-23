import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface ScreenRecordArgs {
  deviceId?: string;
  duration: number;
  savePath: string;
}

export async function screenRecord(args: ScreenRecordArgs, env: Environment) {
  validateAbsolutePath(args.savePath, "Save path");

  const baseArgs: string[] = [];
  if (args.deviceId) baseArgs.push("-s", args.deviceId);

  const remotePath = "/sdcard/screen_recording.mp4";

  // Record on device (screenrecord blocks for duration)
  const recordResult = await executeCommand(
    env.adbPath,
    [...baseArgs, "shell", "screenrecord", "--time-limit", String(args.duration), remotePath],
    { timeout: (args.duration + 10) * 1000 },
  );

  if (!recordResult.success) {
    return errorResponse(`Screen recording failed.\n\n${recordResult.stderr}`);
  }

  // Pull to local machine
  const pullResult = await executeCommand(
    env.adbPath,
    [...baseArgs, "pull", remotePath, args.savePath],
    { timeout: 30_000 },
  );

  // Clean up remote file
  await executeCommand(env.adbPath, [...baseArgs, "shell", "rm", remotePath], {
    timeout: 5_000,
  });

  if (!pullResult.success) {
    return errorResponse(`Recording completed but failed to pull file.\n\n${pullResult.stderr}`);
  }

  return textResponse(
    `Screen recording saved to: ${args.savePath}\nDuration: ${args.duration} seconds\n\n${pullResult.stdout}`,
  );
}
