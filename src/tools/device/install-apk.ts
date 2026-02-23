import { existsSync } from "node:fs";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface InstallApkArgs {
  apkPath: string;
  deviceId?: string;
  reinstall: boolean;
  grantPermissions: boolean;
}

export async function installApk(args: InstallApkArgs, env: Environment) {
  const apkPath = validateAbsolutePath(args.apkPath, "APK path");

  if (!existsSync(apkPath)) {
    return errorResponse(`APK not found at: ${apkPath}`);
  }

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("install");
  if (args.reinstall) adbArgs.push("-r");
  if (args.grantPermissions) adbArgs.push("-g");
  adbArgs.push(apkPath);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 60_000,
  });

  if (!result.success || result.stdout.includes("Failure")) {
    return errorResponse(
      `Failed to install APK.\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
    );
  }

  return textResponse(`APK installed successfully.\n\n${result.stdout}`);
}
