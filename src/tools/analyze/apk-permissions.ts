import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface ApkPermissionsArgs {
  apkPath: string;
}

export async function apkPermissions(args: ApkPermissionsArgs, env: Environment) {
  validateAbsolutePath(args.apkPath, "APK path");

  if (!existsSync(args.apkPath)) {
    return errorResponse(`APK not found at: ${args.apkPath}`);
  }

  const apkanalyzer = join(env.androidHome, "cmdline-tools", "latest", "bin", "apkanalyzer");

  const result = await executeCommand(apkanalyzer, ["manifest", "permissions", args.apkPath], {
    timeout: 30_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to read APK permissions.\n\n${result.stderr}`);
  }

  const permissions = result.stdout
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);

  return textResponse(
    permissions.length === 0
      ? "No permissions declared in the APK."
      : `Permissions (${permissions.length}):\n\n${permissions.map((p) => `- ${p.trim()}`).join("\n")}`,
  );
}
