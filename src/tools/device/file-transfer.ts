import { existsSync } from "node:fs";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath, validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

interface FilePushArgs {
  localPath: string;
  remotePath: string;
  deviceId?: string;
}

export async function filePush(
  args: FilePushArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const localPath = validateAbsolutePath(args.localPath, "Local path");
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;

  if (!existsSync(localPath)) {
    return errorResponse(`Local file not found: ${localPath}`);
  }

  const adbArgs: string[] = [];
  if (deviceId) adbArgs.push("-s", deviceId);
  adbArgs.push("push", localPath, args.remotePath);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 60_000,
    signal: extra?.signal,
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

export async function filePull(
  args: FilePullArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const localPath = validateAbsolutePath(args.localPath, "Local path");
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;

  const adbArgs: string[] = [];
  if (deviceId) adbArgs.push("-s", deviceId);
  adbArgs.push("pull", args.remotePath, localPath);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 60_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to pull file.\n\n${result.stderr}`);
  }

  return textResponse(`File pulled: ${args.remotePath} → ${localPath}\n\n${result.stdout}`);
}
