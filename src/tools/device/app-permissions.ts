import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface AppPermissionArgs {
  packageName: string;
  permission: string;
  action: "grant" | "revoke";
  deviceId?: string;
}

export async function appPermission(args: AppPermissionArgs, env: Environment) {
  const packageName = validatePackageName(args.packageName);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "pm", args.action, packageName, args.permission);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
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

export async function listAppPermissions(args: ListAppPermissionsArgs, env: Environment) {
  const packageName = validatePackageName(args.packageName);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "dumpsys", "package", packageName);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to list permissions for ${packageName}.\n\n${result.stderr}`);
  }

  // Extract permission sections
  const lines = result.stdout.split("\n");
  const permLines: string[] = [];
  let inPermSection = false;

  for (const line of lines) {
    if (line.includes("granted=true") || line.includes("granted=false")) {
      permLines.push(line.trim());
    }
    if (line.includes("install permissions:") || line.includes("runtime permissions:")) {
      inPermSection = true;
      permLines.push(`\n${line.trim()}`);
    } else if (inPermSection && line.trim() === "") {
      inPermSection = false;
    }
  }

  return textResponse(
    permLines.length === 0
      ? `No permission info found for ${packageName}.`
      : `Permissions for ${packageName}:\n\n${permLines.join("\n")}`,
  );
}
