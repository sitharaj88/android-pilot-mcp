import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Environment } from "./types.js";
import { logger } from "./utils/logger.js";

export function detectEnvironment(): Environment {
  const androidHome =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    join(homedir(), "Library", "Android", "sdk");

  if (!existsSync(androidHome)) {
    throw new Error(
      `Android SDK not found. Checked ANDROID_HOME, ANDROID_SDK_ROOT, and ${join(homedir(), "Library", "Android", "sdk")}. ` +
        `Set ANDROID_HOME to your SDK installation path.`,
    );
  }

  const adbPath = resolveToolPath(androidHome, ["platform-tools/adb"]);

  const emulatorPath = resolveToolPath(androidHome, ["emulator/emulator"]);

  const avdmanagerPath = resolveToolPath(androidHome, [
    "cmdline-tools/latest/bin/avdmanager",
    "cmdline-tools/bin/avdmanager",
    "tools/bin/avdmanager",
  ]);

  const sdkmanagerPath = resolveToolPath(androidHome, [
    "cmdline-tools/latest/bin/sdkmanager",
    "cmdline-tools/bin/sdkmanager",
    "tools/bin/sdkmanager",
  ]);

  const javaHome = process.env.JAVA_HOME;

  logger.info("Environment detected", {
    androidHome,
    adb: adbPath,
    emulator: emulatorPath,
    avdmanager: avdmanagerPath,
    sdkmanager: sdkmanagerPath,
    ...(javaHome ? { javaHome } : {}),
  });

  return {
    androidHome,
    adbPath,
    emulatorPath,
    avdmanagerPath,
    sdkmanagerPath,
    javaHome,
  };
}

function resolveToolPath(androidHome: string, candidates: string[]): string {
  for (const rel of candidates) {
    const abs = join(androidHome, rel);
    if (existsSync(abs)) return abs;
  }
  const fallback = join(androidHome, candidates[0]);
  logger.warn(`Tool not found, will use fallback: ${fallback}`);
  return fallback;
}
