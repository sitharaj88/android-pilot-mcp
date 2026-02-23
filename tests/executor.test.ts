import { describe, it, expect, vi, beforeEach } from "vitest";
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

  it("detects timeout via SIGTERM", async () => {
    const err = Object.assign(new Error("killed"), {
      killed: true,
      signal: "SIGTERM",
      stdout: undefined,
      stderr: undefined,
      code: null,
    });
    mockExecFileAsync.mockRejectedValue(err);

    const result = await executeCommand("slow", ["cmd"]);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.stderr).toBe("Command timed out");
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
        timeout: 5000,
        maxBuffer: 1024,
      }),
    );
  });

  it("uses default timeout and maxBuffer", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await executeCommand("cmd", []);

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "cmd",
      [],
      expect.objectContaining({
        timeout: 120_000,
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
    const mockStdin = { write: vi.fn(), end: vi.fn() };
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
});
