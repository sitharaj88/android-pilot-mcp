import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/Users/testuser"),
}));

// Suppress logger output during tests
vi.mock("../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { existsSync } from "node:fs";
import { detectEnvironment, createUnavailableEnvironment } from "../src/environment.js";
import { ValidationError } from "../src/utils/validation.js";

const mockedExistsSync = vi.mocked(existsSync);

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

describe("detectEnvironment", () => {
  const originalEnv = { ...process.env };
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANDROID_HOME;
    delete process.env.ANDROID_SDK_ROOT;
    delete process.env.JAVA_HOME;
    delete process.env.LOCALAPPDATA;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setPlatform(originalPlatform);
  });

  it("uses ANDROID_HOME when set", () => {
    process.env.ANDROID_HOME = "/custom/sdk";
    mockedExistsSync.mockReturnValue(true);

    const env = detectEnvironment();
    expect(env.androidHome).toBe("/custom/sdk");
  });

  it("falls back to ANDROID_SDK_ROOT", () => {
    process.env.ANDROID_SDK_ROOT = "/alt/sdk";
    mockedExistsSync.mockReturnValue(true);

    const env = detectEnvironment();
    expect(env.androidHome).toBe("/alt/sdk");
  });

  it("falls back to the macOS default path on darwin", () => {
    setPlatform("darwin");
    mockedExistsSync.mockReturnValue(true);

    const env = detectEnvironment();
    expect(env.androidHome).toBe("/Users/testuser/Library/Android/sdk");
  });

  it("falls back to the Linux default path on linux", () => {
    setPlatform("linux");
    mockedExistsSync.mockReturnValue(true);

    const env = detectEnvironment();
    expect(env.androidHome).toBe("/Users/testuser/Android/Sdk");
  });

  it("falls back to the Windows default path on win32", () => {
    setPlatform("win32");
    process.env.LOCALAPPDATA = "/Users/testuser/AppData/Local";
    mockedExistsSync.mockReturnValue(true);

    const env = detectEnvironment();
    expect(env.androidHome).toBe("/Users/testuser/AppData/Local/Android/Sdk");
  });

  it("tries the next platform fallback if the primary one is missing", () => {
    setPlatform("linux");
    mockedExistsSync.mockImplementation(
      (path) => String(path) === "/Users/testuser/Library/Android/sdk",
    );

    const env = detectEnvironment();
    expect(env.androidHome).toBe("/Users/testuser/Library/Android/sdk");
  });

  it("throws when SDK not found", () => {
    mockedExistsSync.mockReturnValue(false);

    expect(() => detectEnvironment()).toThrow("Android SDK not found");
  });

  it("captures JAVA_HOME when set", () => {
    process.env.ANDROID_HOME = "/sdk";
    process.env.JAVA_HOME = "/usr/lib/jvm/java-17";
    mockedExistsSync.mockReturnValue(true);

    const env = detectEnvironment();
    expect(env.javaHome).toBe("/usr/lib/jvm/java-17");
  });

  it("leaves javaHome undefined when not set", () => {
    process.env.ANDROID_HOME = "/sdk";
    mockedExistsSync.mockReturnValue(true);

    const env = detectEnvironment();
    expect(env.javaHome).toBeUndefined();
  });

  it("resolves tool paths from candidates", () => {
    process.env.ANDROID_HOME = "/sdk";
    mockedExistsSync.mockImplementation((path) => {
      const p = String(path);
      if (p === "/sdk") return true;
      if (p === "/sdk/platform-tools/adb") return true;
      if (p === "/sdk/emulator/emulator") return true;
      if (p === "/sdk/cmdline-tools/latest/bin/avdmanager") return false;
      if (p === "/sdk/cmdline-tools/bin/avdmanager") return true;
      if (p === "/sdk/cmdline-tools/latest/bin/sdkmanager") return true;
      return false;
    });

    const env = detectEnvironment();
    expect(env.adbPath).toBe("/sdk/platform-tools/adb");
    expect(env.avdmanagerPath).toBe("/sdk/cmdline-tools/bin/avdmanager");
    expect(env.sdkmanagerPath).toBe("/sdk/cmdline-tools/latest/bin/sdkmanager");
  });
});

describe("createUnavailableEnvironment", () => {
  it("throws a ValidationError on any property access", () => {
    const env = createUnavailableEnvironment("Android SDK not found.");
    expect(() => env.androidHome).toThrow(ValidationError);
    expect(() => env.adbPath).toThrow(ValidationError);
  });

  it("includes the original reason and a hint to set ANDROID_HOME", () => {
    const env = createUnavailableEnvironment("Android SDK not found.");
    try {
      void env.adbPath;
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as Error).message).toContain("Android SDK not found.");
      expect((err as Error).message).toContain("ANDROID_HOME");
    }
  });
});
