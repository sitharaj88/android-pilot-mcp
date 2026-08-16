import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { stopEmulator } from "../../../src/tools/device/stop-emulator.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

describe("stopEmulator", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid device id without calling adb", async () => {
    await expect(stopEmulator({ deviceId: "bad id!" }, env)).rejects.toThrow(/Invalid device ID/);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  it("rejects an oversized device id", async () => {
    await expect(stopEmulator({ deviceId: "x".repeat(65) }, env)).rejects.toThrow(
      /Device ID must be/,
    );
  });

  it("stops the emulator with the given serial", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("OK: killing emulator-5554\n"));

    const result = await stopEmulator({ deviceId: "emulator-5554" }, env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      ["-s", "emulator-5554", "emu", "kill"],
      { timeout: 15_000, signal: undefined },
    );
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("emulator-5554 stopped");
  });

  it("returns an error response when adb fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("no such device", 1));

    const result = await stopEmulator({ deviceId: "emulator-5554" }, env);
    expect(result.isError).toBe(true);
  });
});
