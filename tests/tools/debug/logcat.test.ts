import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { logcatRead } from "../../../src/tools/debug/logcat.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

describe("logcatRead", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads basic logcat with default lines", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult("01-01 12:00:00.000 1234 5678 I MyApp: Hello\n"),
    );

    const result = await logcatRead({ lines: 100 }, env);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("MyApp");
  });

  it("passes device ID when provided", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("log output"));

    await logcatRead({ lines: 50, deviceId: "emulator-5554" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.arrayContaining(["-s", "emulator-5554"]),
      expect.any(Object),
    );
  });

  it("filters by tag and priority", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("error log"));

    await logcatRead({ lines: 50, tag: "MyApp", priority: "E" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.arrayContaining(["MyApp:E", "*:S"]),
      expect.any(Object),
    );
  });

  it("filters by tag only with default verbose priority", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("log"));

    await logcatRead({ lines: 50, tag: "MyApp" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.arrayContaining(["MyApp:V", "*:S"]),
      expect.any(Object),
    );
  });

  it("filters by priority only", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("warnings"));

    await logcatRead({ lines: 50, priority: "W" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.arrayContaining(["*:W"]),
      expect.any(Object),
    );
  });

  it("applies grep filter to output", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult("line with error\nline without\nanother error here\n"),
    );

    const result = await logcatRead({ lines: 100, grep: "error" }, env);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("error");
    expect(text).not.toContain("line without");
  });

  it("returns empty message when grep filters everything", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("no matching content\n"));

    const result = await logcatRead({ lines: 100, grep: "zzzzz" }, env);
    const text = (result.content[0] as { text: string }).text;
    expect(text.toLowerCase()).toContain("no matching");
  });

  it("returns error when adb fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("adb: device not found", 1));

    const result = await logcatRead({ lines: 100 }, env);
    expect(result.isError).toBe(true);
  });
});
