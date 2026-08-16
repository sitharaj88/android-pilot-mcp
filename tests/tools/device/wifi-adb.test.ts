import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { wifiAdbConnect } from "../../../src/tools/device/wifi-adb.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

describe("wifiAdbConnect", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries getting the device IP instead of a fixed sleep, and connects once ready", async () => {
    let ipAttempts = 0;
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs.includes("tcpip")) {
        return mockSuccessResult("restarting in TCP mode port: 5555\n");
      }
      if (cmdArgs.includes("route")) {
        ipAttempts += 1;
        if (ipAttempts < 3) {
          return mockFailureResult("device offline", 1);
        }
        return mockSuccessResult("1.2.3.4 dev wlan0 src 192.168.1.42 uid 0\n");
      }
      if (cmdArgs[0] === "connect") {
        return mockSuccessResult("connected to 192.168.1.42:5555\n");
      }
      throw new Error(`Unexpected call: ${JSON.stringify(cmdArgs)}`);
    });

    const promise = wifiAdbConnect({ port: 5555 }, env);

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(1_000);
    }

    const result = await promise;

    expect(ipAttempts).toBe(3);
    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("192.168.1.42:5555");
  });

  it("gives up after the bounded number of retry attempts", async () => {
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs.includes("tcpip")) {
        return mockSuccessResult("restarting in TCP mode port: 5555\n");
      }
      if (cmdArgs.includes("route")) {
        return mockFailureResult("device offline", 1);
      }
      throw new Error(`Unexpected call: ${JSON.stringify(cmdArgs)}`);
    });

    const promise = wifiAdbConnect({ port: 5555 }, env);

    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(1_000);
    }

    const result = await promise;
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("failed to get device IP");
  });

  it("rejects an invalid device id", async () => {
    await expect(wifiAdbConnect({ deviceId: "bad id!", port: 5555 }, env)).rejects.toThrow(
      /Invalid device ID/,
    );
  });
});
