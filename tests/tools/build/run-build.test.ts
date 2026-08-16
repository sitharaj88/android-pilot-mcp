import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult, mockTimeoutResult } from "../../helpers/fixtures.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { existsSync } from "node:fs";
import { executeCommand } from "../../../src/executor.js";
import { runGradleBuild } from "../../../src/tools/build/run-build.js";
import type { ToolExtra } from "../../../src/tools/build/extra.js";
import type { ExecResult } from "../../../src/types.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedExecuteCommand = vi.mocked(executeCommand);

function createExtra(overrides: Partial<ToolExtra> = {}): ToolExtra {
  return {
    signal: new AbortController().signal,
    sendNotification: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn(),
    requestId: "test-request-id",
    ...overrides,
  } as unknown as ToolExtra;
}

describe("runGradleBuild", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when gradlew is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("No Gradle wrapper found");
  });

  it("builds debug variant successfully", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBeUndefined();
    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.stringContaining("gradlew"),
      expect.arrayContaining(["assembleDebug"]),
      expect.any(Object),
    );
  });

  it("builds release variant", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    await runGradleBuild(
      { projectDir: "/project", variant: "release", stacktrace: false },
      env,
      createExtra(),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["assembleRelease"]),
      expect.any(Object),
    );
  });

  it("builds specific module", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    await runGradleBuild(
      { projectDir: "/project", variant: "debug", module: ":app", stacktrace: false },
      env,
      createExtra(),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([":app:assembleDebug"]),
      expect.any(Object),
    );
  });

  it("includes stacktrace flag", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: true },
      env,
      createExtra(),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["--stacktrace"]),
      expect.any(Object),
    );
  });

  it("returns error on build failure", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("Compilation failed", 1));

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Build failed");
  });

  it("returns error on timeout", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockTimeoutResult());

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("TIMED OUT");
  });

  it("uses 300s timeout for builds", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));

    await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ timeout: 300_000 }),
    );
  });

  it("returns structuredContent on success", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      success: true,
      exitCode: 0,
      truncated: false,
    });
  });

  it("returns structuredContent on failure", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("Compilation failed", 1));

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      success: false,
      exitCode: 1,
      truncated: false,
    });
  });

  it("marks truncated:true in structuredContent when output exceeds the limit", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("x".repeat(200 * 1024)));

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      createExtra(),
    );

    expect(result.structuredContent).toMatchObject({ success: true, truncated: true });
  });

  it("passes the abort signal through to executeCommand", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));
    const controller = new AbortController();
    const extra = createExtra({ signal: controller.signal });

    await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
      extra,
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  describe("progress notifications", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("sends heartbeat progress notifications when a progressToken is present", async () => {
      vi.useFakeTimers();
      mockedExistsSync.mockReturnValue(true);

      let resolveExec!: (value: ExecResult) => void;
      const execPromise = new Promise<ExecResult>((resolve) => {
        resolveExec = resolve;
      });
      mockedExecuteCommand.mockReturnValue(execPromise);

      const sendNotification = vi.fn().mockResolvedValue(undefined);
      const extra = createExtra({
        _meta: { progressToken: "token-1" },
        sendNotification,
      });

      const resultPromise = runGradleBuild(
        { projectDir: "/project", variant: "debug", stacktrace: false },
        env,
        extra,
      );

      await vi.advanceTimersByTimeAsync(7_000);

      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "notifications/progress",
          params: expect.objectContaining({ progressToken: "token-1" }),
        }),
      );

      resolveExec(mockSuccessResult("BUILD SUCCESSFUL"));
      await resultPromise;
    });

    it("does not crash with an unhandled rejection when sendNotification rejects (e.g. transport disconnected)", async () => {
      vi.useFakeTimers();
      mockedExistsSync.mockReturnValue(true);

      let resolveExec!: (value: ExecResult) => void;
      const execPromise = new Promise<ExecResult>((resolve) => {
        resolveExec = resolve;
      });
      mockedExecuteCommand.mockReturnValue(execPromise);

      const sendNotification = vi.fn().mockRejectedValue(new Error("Not connected"));
      const extra = createExtra({
        _meta: { progressToken: "token-1" },
        sendNotification,
      });

      const unhandledRejections: unknown[] = [];
      const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
      process.on("unhandledRejection", onUnhandledRejection);

      try {
        const resultPromise = runGradleBuild(
          { projectDir: "/project", variant: "debug", stacktrace: false },
          env,
          extra,
        );

        await vi.advanceTimersByTimeAsync(7_000);
        // Let the rejected promise's .catch() microtask settle.
        await Promise.resolve();
        await Promise.resolve();

        expect(sendNotification).toHaveBeenCalled();
        expect(unhandledRejections).toEqual([]);

        resolveExec(mockSuccessResult("BUILD SUCCESSFUL"));
        await resultPromise;
      } finally {
        process.off("unhandledRejection", onUnhandledRejection);
      }
    });

    it("does not send progress notifications without a progressToken", async () => {
      vi.useFakeTimers();
      mockedExistsSync.mockReturnValue(true);

      let resolveExec!: (value: ExecResult) => void;
      const execPromise = new Promise<ExecResult>((resolve) => {
        resolveExec = resolve;
      });
      mockedExecuteCommand.mockReturnValue(execPromise);

      const sendNotification = vi.fn().mockResolvedValue(undefined);
      const extra = createExtra({ sendNotification });

      const resultPromise = runGradleBuild(
        { projectDir: "/project", variant: "debug", stacktrace: false },
        env,
        extra,
      );

      await vi.advanceTimersByTimeAsync(20_000);
      expect(sendNotification).not.toHaveBeenCalled();

      resolveExec(mockSuccessResult("BUILD SUCCESSFUL"));
      await resultPromise;
    });
  });
});
