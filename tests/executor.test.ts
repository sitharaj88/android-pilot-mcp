import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promisify } from "node:util";

// vi.hoisted ensures these are available when vi.mock factory runs (hoisted)
const { mockExecFileAsync, mockSpawn } = vi.hoisted(() => {
  return {
    mockExecFileAsync: vi.fn(),
    mockSpawn: vi.fn(),
  };
});

vi.mock("node:child_process", () => {
  const execFileFn = Object.assign(vi.fn(), {
    [promisify.custom]: mockExecFileAsync,
  });
  return {
    execFile: execFileFn,
    spawn: mockSpawn,
  };
});

import { executeCommand, spawnDetached, executeCommandWithStdin } from "../src/executor.js";

describe("executeCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns success result on successful command", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "output text", stderr: "" });

    const result = await executeCommand("echo", ["hello"]);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output text");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it("returns failure result with exit code", async () => {
    const err = Object.assign(new Error("failed"), {
      code: 1,
      stdout: "partial",
      stderr: "error output",
      killed: false,
      signal: null,
    });
    mockExecFileAsync.mockRejectedValue(err);

    const result = await executeCommand("bad", ["cmd"]);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("partial");
    expect(result.stderr).toBe("error output");
    expect(result.timedOut).toBe(false);
  });

  it("does not report timedOut for an external SIGTERM unrelated to our own timer", async () => {
    const err = Object.assign(new Error("killed"), {
      killed: true,
      signal: "SIGTERM",
      stdout: undefined,
      stderr: undefined,
      code: null,
    });
    mockExecFileAsync.mockRejectedValue(err);

    const result = await executeCommand("slow", ["cmd"], { timeout: 120_000 });
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(false);
  });

  it("marks timedOut when our own timer elapses", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    mockExecFileAsync.mockImplementation(
      (_cmd: string, _args: string[], opts: { signal: AbortSignal }) => {
        capturedSignal = opts.signal;
        return new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(
              Object.assign(new Error("aborted"), {
                killed: true,
                signal: "SIGTERM",
                code: null,
                stdout: "",
                stderr: "",
              }),
            );
          });
        });
      },
    );

    const resultPromise = executeCommand("slow", ["cmd"], { timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(capturedSignal?.aborted).toBe(true);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.stderr).toBe("Command timed out");
  });

  it("cancels via an external AbortSignal without reporting a timeout", async () => {
    const controller = new AbortController();
    mockExecFileAsync.mockImplementation(
      (_cmd: string, _args: string[], opts: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(
              Object.assign(new Error("aborted"), {
                killed: true,
                signal: "SIGTERM",
                code: null,
                stdout: "",
                stderr: "",
              }),
            );
          });
        });
      },
    );

    const resultPromise = executeCommand("slow", ["cmd"], { signal: controller.signal });
    controller.abort();
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("cancel");
  });

  it("short-circuits when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await executeCommand("slow", ["cmd"], { signal: controller.signal });
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("cancel");
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });

  it("passes options through", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await executeCommand("cmd", ["arg"], {
      cwd: "/tmp",
      timeout: 5000,
      maxBuffer: 1024,
    });

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "cmd",
      ["arg"],
      expect.objectContaining({
        cwd: "/tmp",
        maxBuffer: 1024,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("forwards an external AbortSignal into the execFile call", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });
    const controller = new AbortController();

    await executeCommand("cmd", ["arg"], { signal: controller.signal });

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "cmd",
      ["arg"],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("uses default maxBuffer", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await executeCommand("cmd", []);

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "cmd",
      [],
      expect.objectContaining({
        maxBuffer: 10 * 1024 * 1024,
      }),
    );
  });

  it("handles error with no stdout/stderr properties", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("generic error"));

    const result = await executeCommand("cmd", []);
    expect(result.success).toBe(false);
    expect(result.stderr).toBe("generic error");
  });

  it("coerces a non-numeric error code (e.g. ABORT_ERR) to null instead of passing it through", async () => {
    const err = Object.assign(new Error("The operation was aborted"), {
      code: "ABORT_ERR",
      stdout: "",
      stderr: "",
      killed: true,
      signal: "SIGTERM",
    });
    mockExecFileAsync.mockRejectedValue(err);

    const result = await executeCommand("cmd", []);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBeNull();
    expect(typeof result.exitCode).not.toBe("string");
  });

  it("coerces the maxBuffer overrun error code to null", async () => {
    const err = Object.assign(new Error("stdout maxBuffer exceeded"), {
      code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
      stdout: "partial",
      stderr: "",
    });
    mockExecFileAsync.mockRejectedValue(err);

    const result = await executeCommand("cmd", []);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBeNull();
  });

  it("preserves the child's captured stderr on timeout instead of discarding it", async () => {
    vi.useFakeTimers();
    mockExecFileAsync.mockImplementation(
      (_cmd: string, _args: string[], opts: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(
              Object.assign(new Error("aborted"), {
                killed: true,
                signal: "SIGTERM",
                code: null,
                stdout: "",
                stderr: "some real error output from the child process",
              }),
            );
          });
        });
      },
    );

    const resultPromise = executeCommand("slow", ["cmd"], { timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(result.timedOut).toBe(true);
    expect(result.stderr).toContain("Command timed out");
    expect(result.stderr).toContain("some real error output from the child process");
  });
});

describe("spawnDetached", () => {
  it("spawns a detached process and returns pid", () => {
    const mockChild = {
      pid: 12345,
      unref: vi.fn(),
    };
    mockSpawn.mockReturnValue(mockChild);

    const result = spawnDetached("emulator", ["-avd", "test"]);
    expect(result.pid).toBe(12345);
    expect(mockChild.unref).toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledWith(
      "emulator",
      ["-avd", "test"],
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
      }),
    );
  });
});

describe("executeCommandWithStdin", () => {
  it("writes stdin data and returns result", async () => {
    const mockStdin = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
    const mockStdout = {
      setEncoding: vi.fn(),
      on: vi.fn((event: string, cb: (data: string) => void) => {
        if (event === "data") cb("output");
      }),
    };
    const mockStderr = {
      setEncoding: vi.fn(),
      on: vi.fn(),
    };
    const mockChild = {
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === "close") cb(0);
      }),
      kill: vi.fn(),
    };
    mockSpawn.mockReturnValue(mockChild);

    const result = await executeCommandWithStdin("cmd", ["arg"], "input data");
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output");
    expect(mockStdin.write).toHaveBeenCalledWith("input data");
    expect(mockStdin.end).toHaveBeenCalled();
  });

  it("kills the child and reports cancellation when aborted via an external signal", async () => {
    const controller = new AbortController();
    const mockStdin = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
    const mockStdout = { setEncoding: vi.fn(), on: vi.fn() };
    const mockStderr = { setEncoding: vi.fn(), on: vi.fn() };
    let closeCb: ((code: number) => void) | undefined;
    const mockChild = {
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: mockStderr,
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === "close") closeCb = cb;
      }),
      kill: vi.fn(() => {
        closeCb?.(null as unknown as number);
      }),
    };
    mockSpawn.mockReturnValue(mockChild);

    const resultPromise = executeCommandWithStdin("cmd", ["arg"], "input", {
      signal: controller.signal,
    });
    controller.abort();
    const result = await resultPromise;

    expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("cancel");
  });

  it("short-circuits when the signal is already aborted before spawning", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await executeCommandWithStdin("cmd", ["arg"], "input", {
      signal: controller.signal,
    });

    expect(result.success).toBe(false);
    expect(result.stderr).toContain("cancel");
    expect(mockSpawn).not.toHaveBeenCalled();
  });
});
