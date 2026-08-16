import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";
import type { ToolExtra } from "../../../src/tools/device/types.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
  spawnDetached: vi.fn(),
}));

import { executeCommand, spawnDetached } from "../../../src/executor.js";
import { startEmulator } from "../../../src/tools/device/start-emulator.js";

const mockedExecuteCommand = vi.mocked(executeCommand);
const mockedSpawnDetached = vi.mocked(spawnDetached);

function mockExtra(overrides: Partial<ToolExtra> = {}): ToolExtra {
  return {
    signal: new AbortController().signal,
    sendNotification: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn(),
    requestId: "test-request",
    ...overrides,
  } as unknown as ToolExtra;
}

const args = { avdName: "test_avd", coldBoot: false, noWindow: false, wipeData: false };

describe("startEmulator", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockedSpawnDetached.mockReturnValue({ pid: 4242 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("diffs adb devices to find only the newly launched serial, and polls boot status with -s on that serial", async () => {
    let devicesCalls = 0;
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs[0] === "devices") {
        devicesCalls += 1;
        if (devicesCalls === 1) {
          return mockSuccessResult("List of devices attached\nemulator-5554\tdevice\n");
        }
        return mockSuccessResult(
          "List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice\n",
        );
      }
      if (cmdArgs[0] === "-s" && cmdArgs[1] === "emulator-5556") {
        return mockSuccessResult("1\n");
      }
      throw new Error(`Unexpected executeCommand call: ${JSON.stringify(cmdArgs)}`);
    });

    const promise = startEmulator(args, env, mockExtra());

    await vi.advanceTimersByTimeAsync(3_000); // detects new serial emulator-5556
    await vi.advanceTimersByTimeAsync(3_000); // boot check on emulator-5556 succeeds

    const result = await promise;
    const text = (result.content[0] as { text: string }).text;

    expect(text).toContain("emulator-5556");
    expect(text).not.toContain("emulator-5554");
    expect(result.isError).toBeUndefined();

    const bootCheckCalls = mockedExecuteCommand.mock.calls.filter(
      (call) => call[1][2] === "shell" && call[1][3] === "getprop",
    );
    expect(bootCheckCalls).toHaveLength(1);
    expect(bootCheckCalls[0][1]).toEqual([
      "-s",
      "emulator-5556",
      "shell",
      "getprop",
      "sys.boot_completed",
    ]);
  });

  it("errors out before spawning when the baseline adb devices snapshot fails, even with a pre-existing emulator", async () => {
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs[0] === "devices") {
        // adb is unreachable for the baseline snapshot, even though a real emulator
        // (emulator-5554) happens to already be attached.
        return mockFailureResult("adb: no such device or unable to connect to daemon", 1);
      }
      throw new Error(`Unexpected executeCommand call: ${JSON.stringify(cmdArgs)}`);
    });

    const result = await startEmulator(args, env, mockExtra());

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).not.toContain("booted successfully");
    expect(text).not.toContain("emulator-5554");
    expect(mockedSpawnDetached).not.toHaveBeenCalled();
  });

  it("skips widening the candidate set when a poll-loop adb devices snapshot fails transiently", async () => {
    let devicesCalls = 0;
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs[0] === "devices") {
        devicesCalls += 1;
        if (devicesCalls === 1) {
          // Baseline succeeds with one pre-existing emulator.
          return mockSuccessResult("List of devices attached\nemulator-5554\tdevice\n");
        }
        if (devicesCalls === 2) {
          // Transient adb failure during polling must not be treated as "no new devices".
          return mockFailureResult("adb: server is out of date", 1);
        }
        return mockSuccessResult(
          "List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice\n",
        );
      }
      if (cmdArgs[0] === "-s" && cmdArgs[1] === "emulator-5556") {
        return mockSuccessResult("1\n");
      }
      throw new Error(`Unexpected executeCommand call: ${JSON.stringify(cmdArgs)}`);
    });

    const promise = startEmulator(args, env, mockExtra());

    await vi.advanceTimersByTimeAsync(3_000); // devices call #2 fails, skip iteration
    await vi.advanceTimersByTimeAsync(3_000); // devices call #3 detects emulator-5556
    await vi.advanceTimersByTimeAsync(3_000); // boot check succeeds

    const result = await promise;
    const text = (result.content[0] as { text: string }).text;
    expect(result.isError).toBeUndefined();
    expect(text).toContain("emulator-5556");
    expect(text).not.toContain("emulator-5554");
  });

  it("stops polling and reports cancellation when the signal aborts", async () => {
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs[0] === "devices") {
        return mockSuccessResult("List of devices attached\n");
      }
      return mockSuccessResult("0\n");
    });

    const controller = new AbortController();
    const promise = startEmulator(args, env, mockExtra({ signal: controller.signal }));

    controller.abort();
    await vi.advanceTimersByTimeAsync(3_000);

    const result = await promise;
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("cancelled");
  });

  it("reports timeout with the detected serial if boot never completes", async () => {
    let devicesCalls = 0;
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs[0] === "devices") {
        devicesCalls += 1;
        if (devicesCalls === 1) {
          return mockSuccessResult("List of devices attached\n");
        }
        return mockSuccessResult("List of devices attached\nemulator-5560\tdevice\n");
      }
      return mockSuccessResult("0\n");
    });

    const promise = startEmulator(args, env, mockExtra());

    for (let i = 0; i < 41; i++) {
      await vi.advanceTimersByTimeAsync(3_000);
    }

    const result = await promise;
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("did not finish booting");
    expect(text).toContain("emulator-5560");
  }, 20_000);

  it("sends progress notifications when a progressToken is present", async () => {
    let devicesCalls = 0;
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs[0] === "devices") {
        devicesCalls += 1;
        if (devicesCalls === 1) {
          return mockSuccessResult("List of devices attached\nemulator-5554\tdevice\n");
        }
        return mockSuccessResult(
          "List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice\n",
        );
      }
      return mockSuccessResult("1\n");
    });

    const extra = mockExtra({ _meta: { progressToken: "tok-1" } });
    const promise = startEmulator(args, env, extra);

    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(3_000);
    await promise;

    expect(extra.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "notifications/progress",
        params: expect.objectContaining({ progressToken: "tok-1" }),
      }),
    );
  });

  it("never sends progress notifications without a progressToken", async () => {
    let devicesCalls = 0;
    mockedExecuteCommand.mockImplementation(async (_cmd, cmdArgs) => {
      if (cmdArgs[0] === "devices") {
        devicesCalls += 1;
        if (devicesCalls === 1) {
          return mockSuccessResult("List of devices attached\nemulator-5554\tdevice\n");
        }
        return mockSuccessResult(
          "List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice\n",
        );
      }
      return mockSuccessResult("1\n");
    });

    const extra = mockExtra();
    const promise = startEmulator(args, env, extra);

    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(3_000);
    await promise;

    expect(extra.sendNotification).not.toHaveBeenCalled();
  });
});
