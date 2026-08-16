import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";
import type { DebugToolExtra } from "../../../src/tools/debug/types.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { screenRecord } from "../../../src/tools/debug/screen-record.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

function mockExtra(overrides: Partial<DebugToolExtra> = {}): DebugToolExtra {
  return {
    signal: new AbortController().signal,
    sendNotification: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn(),
    requestId: "test-request",
    _meta: undefined,
    ...overrides,
  } as unknown as DebugToolExtra;
}

function queueSuccessfulRecording(): void {
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("")); // screenrecord
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("1 file pulled")); // pull
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("")); // rm cleanup
}

function remotePathFromCall(call: unknown[]): string {
  const args = call[1] as string[];
  return args[args.length - 1];
}

describe("screenRecord", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records, pulls, and cleans up the remote file", async () => {
    queueSuccessfulRecording();

    const result = await screenRecord({ duration: 5, savePath: "/tmp/rec.mp4" }, env, mockExtra());

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("/tmp/rec.mp4");
    expect(mockedExecuteCommand).toHaveBeenCalledTimes(3);

    const recordPath = remotePathFromCall(mockedExecuteCommand.mock.calls[0]);
    const rmArgs = mockedExecuteCommand.mock.calls[2][1] as string[];
    expect(recordPath).toMatch(/^\/sdcard\/screen_recording_.+\.mp4$/);
    expect(rmArgs).toEqual(expect.arrayContaining(["rm", "-f", recordPath]));
  });

  it("uses a unique remote path across invocations", async () => {
    queueSuccessfulRecording();
    await screenRecord({ duration: 5, savePath: "/tmp/rec1.mp4" }, env, mockExtra());
    const path1 = remotePathFromCall(mockedExecuteCommand.mock.calls[0]);

    vi.clearAllMocks();
    queueSuccessfulRecording();
    await screenRecord({ duration: 5, savePath: "/tmp/rec2.mp4" }, env, mockExtra());
    const path2 = remotePathFromCall(mockedExecuteCommand.mock.calls[0]);

    expect(path1).not.toBe(path2);
  });

  it("cleans up the remote file even when recording fails", async () => {
    mockedExecuteCommand.mockResolvedValueOnce(mockFailureResult("device offline", 1));
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(""));

    const result = await screenRecord({ duration: 5, savePath: "/tmp/rec.mp4" }, env, mockExtra());

    expect(result.isError).toBe(true);
    expect(mockedExecuteCommand).toHaveBeenCalledTimes(2);
  });

  it("forwards the abort signal to the recording command", async () => {
    queueSuccessfulRecording();
    const controller = new AbortController();

    await screenRecord(
      { duration: 5, savePath: "/tmp/rec.mp4" },
      env,
      mockExtra({ signal: controller.signal }),
    );

    expect(mockedExecuteCommand).toHaveBeenNthCalledWith(
      1,
      env.adbPath,
      expect.any(Array),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("sends progress notifications when a progress token is present", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    mockedExecuteCommand.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(3000);
      return mockSuccessResult("");
    });
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("1 file pulled"));
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(""));

    await screenRecord(
      { duration: 5, savePath: "/tmp/rec.mp4" },
      env,
      mockExtra({ sendNotification, _meta: { progressToken: "abc" } }),
    );

    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "notifications/progress",
        params: expect.objectContaining({ progressToken: "abc", total: 5 }),
      }),
    );
  });

  it("sends strictly increasing progress values and stops once duration is reached", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    mockedExecuteCommand.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(5000);
      return mockSuccessResult("");
    });
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("1 file pulled"));
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(""));

    await screenRecord(
      { duration: 3, savePath: "/tmp/rec.mp4" },
      env,
      mockExtra({ sendNotification, _meta: { progressToken: "abc" } }),
    );

    const progressValues = sendNotification.mock.calls.map(
      (call) => (call[0] as { params: { progress: number } }).params.progress,
    );

    expect(progressValues.length).toBeGreaterThan(0);
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThan(progressValues[i - 1]);
    }
    // Never re-sends the saturated final value once duration is reached.
    expect(progressValues.filter((v) => v === 3)).toHaveLength(1);
  });

  it("does not crash with an unhandled rejection when sendNotification rejects (e.g. transport disconnected)", async () => {
    const sendNotification = vi.fn().mockRejectedValue(new Error("Not connected"));
    mockedExecuteCommand.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(3000);
      return mockSuccessResult("");
    });
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("1 file pulled"));
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(""));

    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      await screenRecord(
        { duration: 5, savePath: "/tmp/rec.mp4" },
        env,
        mockExtra({ sendNotification, _meta: { progressToken: "abc" } }),
      );
      await Promise.resolve();
      await Promise.resolve();

      expect(sendNotification).toHaveBeenCalled();
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  it("never sends progress notifications without a token", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    mockedExecuteCommand.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(3000);
      return mockSuccessResult("");
    });
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("1 file pulled"));
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(""));

    await screenRecord(
      { duration: 5, savePath: "/tmp/rec.mp4" },
      env,
      mockExtra({ sendNotification, _meta: undefined }),
    );

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("rejects a relative savePath", async () => {
    await expect(
      screenRecord({ duration: 5, savePath: "rec.mp4" }, env, mockExtra()),
    ).rejects.toThrow(/absolute path/);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  it("rejects an invalid device id", async () => {
    await expect(
      screenRecord(
        { duration: 5, savePath: "/tmp/rec.mp4", deviceId: "bad id!" },
        env,
        mockExtra(),
      ),
    ).rejects.toThrow(/Invalid device ID/);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });
});
