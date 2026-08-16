import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName, validateDeviceId } from "../../utils/validation.js";
import {
  structuredResponse,
  textResponse,
  errorResponse,
  ToolResponse,
} from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

interface AppPermissionArgs {
  packageName: string;
  permission: string;
  action: "grant" | "revoke";
  deviceId?: string;
}

export async function appPermission(
  args: AppPermissionArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const packageName = validatePackageName(args.packageName);
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;

  const adbArgs: string[] = [];
  if (deviceId) adbArgs.push("-s", deviceId);
  adbArgs.push("shell", "pm", args.action, packageName, args.permission);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(
      `Failed to ${args.action} permission ${args.permission} for ${packageName}.\n\n${result.stderr}`,
    );
  }

  return textResponse(`Permission ${args.action}ed: ${args.permission} for ${packageName}`);
}

interface ListAppPermissionsArgs {
  packageName: string;
  deviceId?: string;
}

export interface PermissionInfo {
  name: string;
  granted: boolean;
}

export async function listAppPermissions(
  args: ListAppPermissionsArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const packageName = validatePackageName(args.packageName);
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;

  const adbArgs: string[] = [];
  if (deviceId) adbArgs.push("-s", deviceId);
  adbArgs.push("shell", "dumpsys", "package", packageName);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to list permissions for ${packageName}.\n\n${result.stderr}`);
  }

  const lines = result.stdout.split("\n");
  const permLines: string[] = [];
  const permissions: PermissionInfo[] = [];
  let inPermSection = false;

  for (const line of lines) {
    const grantMatch = line.match(/^\s*([\w.]+):\s*granted=(true|false)/);
    if (grantMatch) {
      permLines.push(line.trim());
      permissions.push({ name: grantMatch[1], granted: grantMatch[2] === "true" });
    }
    if (line.includes("install permissions:") || line.includes("runtime permissions:")) {
      inPermSection = true;
      permLines.push(`\n${line.trim()}`);
    } else if (inPermSection && line.trim() === "") {
      inPermSection = false;
    }
  }

  const text =
    permLines.length === 0
      ? `No permission info found for ${packageName}.`
      : `Permissions for ${packageName}:\n\n${permLines.join("\n")}`;

  return structuredResponse(text, { permissions });
}
