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
import { detectEnvironment } from "../src/environment.js";

const mockedExistsSync = vi.mocked(existsSync);

describe("detectEnvironment", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANDROID_HOME;
    delete process.env.ANDROID_SDK_ROOT;
    delete process.env.JAVA_HOME;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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

  it("falls back to macOS default path", () => {
    mockedExistsSync.mockReturnValue(true);

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
