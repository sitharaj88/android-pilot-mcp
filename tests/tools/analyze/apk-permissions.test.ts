import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../../src/executor.js";
import { apkPermissions } from "../../../src/tools/analyze/apk-permissions.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedExecuteCommand = vi.mocked(executeCommand);

describe("apkPermissions", () => {
  const env = mockEnvironment();
  const apkPath = "/project/app-debug.apk";
  const apkanalyzerPath = join(env.androidHome, "cmdline-tools", "latest", "bin", "apkanalyzer");

  beforeEach(() => {
    vi.clearAllMocks();
    mockedExistsSync.mockImplementation((path) => path === apkPath || path === apkanalyzerPath);
  });

  it("returns structuredContent with a permissions array on success", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult("android.permission.INTERNET\nandroid.permission.ACCESS_NETWORK_STATE\n"),
    );

    const result = await apkPermissions({ apkPath }, env);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      permissions: ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"],
    });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Permissions (2)");
    expect(text).toContain("android.permission.INTERNET");
  });

  it("returns an empty permissions array with human-readable text when none are declared", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(""));

    const result = await apkPermissions({ apkPath }, env);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ permissions: [] });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("No permissions declared");
  });

  it("returns an error response without structuredContent when the command fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("boom", 1));

    const result = await apkPermissions({ apkPath }, env);

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it("returns an error response when the APK is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await apkPermissions({ apkPath }, env);

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });
});
