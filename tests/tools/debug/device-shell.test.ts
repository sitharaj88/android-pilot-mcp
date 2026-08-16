import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";
import type { DebugToolExtra } from "../../../src/tools/debug/types.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { deviceShell } from "../../../src/tools/debug/device-shell.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

function mockExtra(overrides: Partial<DebugToolExtra> = {}): DebugToolExtra {
  return {
    signal: new AbortController().signal,
    sendNotification: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn(),
    requestId: "test-request",
    ...overrides,
  } as unknown as DebugToolExtra;
}

describe("deviceShell", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs the shell command and returns output", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("hello\n"));

    const result = await deviceShell({ command: "echo hello" }, env, mockExtra());
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("hello");
    expect(result.isError).toBe(false);
  });

  it("passes device ID when provided", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));

    await deviceShell({ command: "ls", deviceId: "emulator-5554" }, env, mockExtra());

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.arrayContaining(["-s", "emulator-5554"]),
      expect.any(Object),
    );
  });

  it("forwards the abort signal to executeCommand", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));
    const controller = new AbortController();

    await deviceShell({ command: "ls" }, env, mockExtra({ signal: controller.signal }));

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      env.adbPath,
      expect.any(Array),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("marks the response as an error when the command fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("permission denied", 1));

    const result = await deviceShell({ command: "rm -rf /data" }, env, mockExtra());
    expect(result.isError).toBe(true);
  });

  it("rejects an invalid device id", async () => {
    await expect(
      deviceShell({ command: "ls", deviceId: "bad id!" }, env, mockExtra()),
    ).rejects.toThrow(/Invalid device ID/);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  it("rejects an oversized shell command", async () => {
    await expect(deviceShell({ command: "x".repeat(5000) }, env, mockExtra())).rejects.toThrow(
      /1-4096 characters/,
    );
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });
});
