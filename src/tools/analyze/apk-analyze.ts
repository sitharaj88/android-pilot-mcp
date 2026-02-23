import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface ApkAnalyzeArgs {
  apkPath: string;
  detail?: "summary" | "full";
}

export async function apkAnalyze(args: ApkAnalyzeArgs, env: Environment) {
  validateAbsolutePath(args.apkPath, "APK path");

  if (!existsSync(args.apkPath)) {
    return errorResponse(`APK not found at: ${args.apkPath}`);
  }

  const apkanalyzer = join(env.androidHome, "cmdline-tools", "latest", "bin", "apkanalyzer");

  const sections: string[] = [];

  // File size
  const fileSize = await executeCommand(apkanalyzer, ["apk", "file-size", args.apkPath], {
    timeout: 30_000,
  });
  if (fileSize.success) sections.push(`APK File Size: ${fileSize.stdout.trim()} bytes`);

  // Download size
  const dlSize = await executeCommand(apkanalyzer, ["apk", "download-size", args.apkPath], {
    timeout: 30_000,
  });
  if (dlSize.success) sections.push(`Download Size: ${dlSize.stdout.trim()} bytes`);

  // Manifest info
  const manifest = await executeCommand(apkanalyzer, ["manifest", "print", args.apkPath], {
    timeout: 30_000,
  });

  if (manifest.success) {
    // Extract key info from manifest
    const minSdkMatch = manifest.stdout.match(/android:minSdkVersion.*?="(\d+)"/);
    const targetSdkMatch = manifest.stdout.match(/android:targetSdkVersion.*?="(\d+)"/);
    const versionNameMatch = manifest.stdout.match(/android:versionName.*?="([^"]+)"/);
    const versionCodeMatch = manifest.stdout.match(/android:versionCode.*?="(\d+)"/);
    const packageMatch = manifest.stdout.match(/package="([^"]+)"/);

    if (packageMatch) sections.push(`Package: ${packageMatch[1]}`);
    if (versionNameMatch) sections.push(`Version: ${versionNameMatch[1]}`);
    if (versionCodeMatch) sections.push(`Version Code: ${versionCodeMatch[1]}`);
    if (minSdkMatch) sections.push(`Min SDK: ${minSdkMatch[1]}`);
    if (targetSdkMatch) sections.push(`Target SDK: ${targetSdkMatch[1]}`);
  }

  // DEX reference count
  const dexRefs = await executeCommand(apkanalyzer, ["dex", "references", args.apkPath], {
    timeout: 30_000,
  });
  if (dexRefs.success) sections.push(`\nDEX References:\n${dexRefs.stdout.trim()}`);

  if (args.detail === "full") {
    // Full file listing
    const files = await executeCommand(apkanalyzer, ["files", "list", args.apkPath], {
      timeout: 30_000,
    });
    if (files.success) {
      const fileList = files.stdout.trim().split("\n");
      sections.push(
        `\nFiles (${fileList.length} total):\n${fileList.slice(0, 50).join("\n")}${fileList.length > 50 ? `\n... and ${fileList.length - 50} more` : ""}`,
      );
    }

    // Full manifest
    if (manifest.success) {
      sections.push(`\nFull Manifest:\n${manifest.stdout}`);
    }
  }

  if (sections.length === 0) {
    return errorResponse(
      `Failed to analyze APK. Ensure apkanalyzer is available at: ${apkanalyzer}`,
    );
  }

  return textResponse(sections.join("\n"));
}
