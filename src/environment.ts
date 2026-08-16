import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Environment } from "./types.js";
import { logger } from "./utils/logger.js";
import { ValidationError } from "./utils/validation.js";

function platformFallbackCandidates(): string[] {
  const home = homedir();
  const macPath = join(home, "Library", "Android", "sdk");
  const linuxPath = join(home, "Android", "Sdk");
  const windowsPath = join(
    process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"),
    "Android",
    "Sdk",
  );

  switch (process.platform) {
    case "darwin":
      return [macPath, linuxPath, windowsPath];
    case "win32":
      return [windowsPath, macPath, linuxPath];
    default:
      return [linuxPath, macPath, windowsPath];
  }
}

export function detectEnvironment(): Environment {
  const explicit = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const candidates = explicit ? [explicit] : platformFallbackCandidates();
  const androidHome = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];

  if (!existsSync(androidHome)) {
    throw new Error(
      `Android SDK not found. Checked ANDROID_HOME, ANDROID_SDK_ROOT, and ${candidates.join(", ")}. ` +
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

export function createUnavailableEnvironment(reason: string): Environment {
  const hint = "Set ANDROID_HOME to your Android SDK installation path to use this tool.";
  const message = reason.includes("ANDROID_HOME") ? reason : `${reason} ${hint}`;
  return new Proxy({} as Environment, {
    get(): never {
      throw new ValidationError(message);
    },
  });
}
