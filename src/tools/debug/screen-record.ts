import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath, validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";
import { cleanupRemoteFile, uniqueRemotePath } from "./remote-file.js";
import { DebugToolExtra } from "./types.js";

interface ScreenRecordArgs {
  deviceId?: string;
  duration: number;
  savePath: string;
}

export async function screenRecord(
  args: ScreenRecordArgs,
  env: Environment,
  extra: DebugToolExtra,
) {
  validateAbsolutePath(args.savePath, "Save path");
  if (args.deviceId) validateDeviceId(args.deviceId);

  const baseArgs: string[] = [];
  if (args.deviceId) baseArgs.push("-s", args.deviceId);

  const remotePath = uniqueRemotePath("screen_recording", "mp4");

  const progressToken = extra._meta?.progressToken;
  let progressTimer: ReturnType<typeof setInterval> | undefined;
  if (progressToken !== undefined) {
    let elapsed = 0;
    progressTimer = setInterval(() => {
      elapsed = Math.min(elapsed + 1, args.duration);
      void extra
        .sendNotification({
          method: "notifications/progress",
          params: {
            progressToken,
            progress: elapsed,
            total: args.duration,
            message: `Recording... ${elapsed}/${args.duration}s`,
          },
        })
        .catch(() => {});
      if (elapsed >= args.duration && progressTimer) {
        clearInterval(progressTimer);
      }
    }, 1000);
  }

  let recordResult;
  try {
    // Record on device (screenrecord blocks for duration)
    recordResult = await executeCommand(
      env.adbPath,
      [...baseArgs, "shell", "screenrecord", "--time-limit", String(args.duration), remotePath],
      { timeout: (args.duration + 10) * 1000, signal: extra.signal },
    );
  } finally {
    if (progressTimer) clearInterval(progressTimer);
  }

  if (!recordResult.success) {
    await cleanupRemoteFile(env.adbPath, baseArgs, remotePath);
    return errorResponse(`Screen recording failed.\n\n${recordResult.stderr}`);
  }

  // Pull to local machine
  const pullResult = await executeCommand(
    env.adbPath,
    [...baseArgs, "pull", remotePath, args.savePath],
    { timeout: 30_000 },
  );

  // Clean up remote file
  await cleanupRemoteFile(env.adbPath, baseArgs, remotePath);

  if (!pullResult.success) {
    return errorResponse(`Recording completed but failed to pull file.\n\n${pullResult.stderr}`);
  }

  return textResponse(
    `Screen recording saved to: ${args.savePath}\nDuration: ${args.duration} seconds\n\n${pullResult.stdout}`,
  );
}
