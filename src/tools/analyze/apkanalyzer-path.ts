import { existsSync } from "node:fs";
import { join } from "node:path";
import { ValidationError } from "../../utils/validation.js";

const APKANALYZER_BIN = process.platform === "win32" ? "apkanalyzer.bat" : "apkanalyzer";

const APKANALYZER_CANDIDATES = [
  join("cmdline-tools", "latest", "bin", APKANALYZER_BIN),
  join("cmdline-tools", "bin", APKANALYZER_BIN),
  join("tools", "bin", APKANALYZER_BIN),
];

export function resolveApkAnalyzer(androidHome: string): string {
  for (const rel of APKANALYZER_CANDIDATES) {
    const abs = join(androidHome, rel);
    if (existsSync(abs)) return abs;
  }
  const attempted = APKANALYZER_CANDIDATES.map((rel) => join(androidHome, rel));
  throw new ValidationError(
    `apkanalyzer not found. Checked:\n${attempted.map((p) => `  - ${p}`).join("\n")}\n` +
      `Install the Android SDK command-line tools and ensure ANDROID_HOME points to the SDK root.`,
  );
}
