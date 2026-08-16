import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult } from "../../helpers/fixtures.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../../src/executor.js";
import { apkAnalyze } from "../../../src/tools/analyze/apk-analyze.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedExecuteCommand = vi.mocked(executeCommand);

describe("apkAnalyze apkanalyzer resolution", () => {
  const env = mockEnvironment();
  const apkPath = "/project/app-debug.apk";

  beforeEach(() => {
    vi.clearAllMocks();
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(""));
  });

  it("uses cmdline-tools/latest/bin when it exists", async () => {
    const latestPath = join(env.androidHome, "cmdline-tools", "latest", "bin", "apkanalyzer");
    mockedExistsSync.mockImplementation((path) => {
      if (path === apkPath) return true;
      return path === latestPath;
    });

    await apkAnalyze({ apkPath, detail: "summary" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      latestPath,
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("falls back to cmdline-tools/bin when latest is unavailable", async () => {
    const fallbackPath = join(env.androidHome, "cmdline-tools", "bin", "apkanalyzer");
    mockedExistsSync.mockImplementation((path) => {
      if (path === apkPath) return true;
      return path === fallbackPath;
    });

    await apkAnalyze({ apkPath, detail: "summary" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      fallbackPath,
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("falls back to tools/bin when neither cmdline-tools location exists", async () => {
    const legacyPath = join(env.androidHome, "tools", "bin", "apkanalyzer");
    mockedExistsSync.mockImplementation((path) => {
      if (path === apkPath) return true;
      return path === legacyPath;
    });

    await apkAnalyze({ apkPath, detail: "summary" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      legacyPath,
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("throws a clear error naming every attempted path when apkanalyzer is missing", async () => {
    mockedExistsSync.mockImplementation((path) => path === apkPath);

    await expect(apkAnalyze({ apkPath, detail: "summary" }, env)).rejects.toThrow(
      /apkanalyzer not found/,
    );
    await expect(apkAnalyze({ apkPath, detail: "summary" }, env)).rejects.toThrow(
      /cmdline-tools.*latest.*bin/,
    );
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  it("returns an error response when the APK file itself is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await apkAnalyze({ apkPath, detail: "summary" }, env);

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("APK not found");
  });
});
