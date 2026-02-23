import { existsSync } from "node:fs";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface FilePushArgs {
  localPath: string;
  remotePath: string;
  deviceId?: string;
}

export async function filePush(args: FilePushArgs, env: Environment) {
  const localPath = validateAbsolutePath(args.localPath, "Local path");

  if (!existsSync(localPath)) {
    return errorResponse(`Local file not found: ${localPath}`);
  }

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("push", localPath, args.remotePath);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 60_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to push file.\n\n${result.stderr}`);
  }

  return textResponse(`File pushed: ${localPath} → ${args.remotePath}\n\n${result.stdout}`);
}

interface FilePullArgs {
  remotePath: string;
  localPath: string;
  deviceId?: string;
}

export async function filePull(args: FilePullArgs, env: Environment) {
  const localPath = validateAbsolutePath(args.localPath, "Local path");

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("pull", args.remotePath, localPath);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 60_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to pull file.\n\n${result.stderr}`);
  }

  return textResponse(`File pulled: ${args.remotePath} → ${localPath}\n\n${result.stdout}`);
}
