import { existsSync } from "node:fs";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import { structuredResponse, errorResponse } from "../../utils/response.js";
import { resolveApkAnalyzer } from "./apkanalyzer-path.js";
import type { AnalyzeToolExtra } from "./types.js";

interface ApkPermissionsArgs {
  apkPath: string;
}

export async function apkPermissions(
  args: ApkPermissionsArgs,
  env: Environment,
  extra?: AnalyzeToolExtra,
) {
  validateAbsolutePath(args.apkPath, "APK path");

  if (!existsSync(args.apkPath)) {
    return errorResponse(`APK not found at: ${args.apkPath}`);
  }

  const apkanalyzer = resolveApkAnalyzer(env.androidHome);

  const result = await executeCommand(apkanalyzer, ["manifest", "permissions", args.apkPath], {
    timeout: 30_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to read APK permissions.\n\n${result.stderr}`);
  }

  const permissions = result.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const text =
    permissions.length === 0
      ? "No permissions declared in the APK."
      : `Permissions (${permissions.length}):\n\n${permissions.map((p) => `- ${p}`).join("\n")}`;

  return structuredResponse(text, { permissions });
}
