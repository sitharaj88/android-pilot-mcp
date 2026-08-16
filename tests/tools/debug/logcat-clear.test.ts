import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { logcatClear } from "../../../src/tools/debug/logcat-clear.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

describe("logcatClear", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the logcat buffer", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(""));

    const result = await logcatClear({}, env);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("cleared");
    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.arrayContaining(["logcat", "-c"]),
      expect.any(Object),
    );
  });

  it("passes device ID when provided", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(""));

    await logcatClear({ deviceId: "emulator-5554" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.arrayContaining(["-s", "emulator-5554"]),
      expect.any(Object),
    );
  });

  it("returns error when adb fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("adb: device not found", 1));

    const result = await logcatClear({}, env);
    expect(result.isError).toBe(true);
  });

  it("rejects an invalid device id", async () => {
    await expect(logcatClear({ deviceId: "bad id!" }, env)).rejects.toThrow(/Invalid device ID/);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });
});
