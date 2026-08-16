import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { ExecResult, ExecOptions } from "./types.js";

const execFileAsync = promisify(execFile);

export async function executeCommand(
  command: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  const { cwd, timeout = 120_000, maxBuffer = 10 * 1024 * 1024, env: extraEnv, signal } = options;

  if (signal?.aborted) {
    return {
      success: false,
      stdout: "",
      stderr: "Command cancelled.",
      exitCode: null,
      timedOut: false,
    };
  }

  const controller = new AbortController();
  let didTimeout = false;
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeout);

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      maxBuffer,
      encoding: "utf-8",
      env: { ...process.env, ...extraEnv },
      signal: controller.signal,
    });
    return { success: true, stdout, stderr, exitCode: 0, timedOut: false };
  } catch (err: unknown) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      killed?: boolean;
      signal?: string;
      message?: string;
    };
    const cancelled = !didTimeout && signal?.aborted === true;
    const stderr = didTimeout
      ? `Command timed out${e.stderr ? `\n\n${e.stderr}` : ""}`
      : cancelled
        ? "Command cancelled."
        : (e.stderr ?? e.message ?? "Unknown error");
    return {
      success: false,
      stdout: e.stdout ?? "",
      stderr,
      exitCode: typeof e.code === "number" ? e.code : null,
      timedOut: didTimeout,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

export function spawnDetached(
  command: string,
  args: string[],
  options: { env?: Record<string, string> } = {},
): { pid: number } {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, ...options.env },
  });
  child.unref();
  return { pid: child.pid! };
}

export async function executeCommandWithStdin(
  command: string,
  args: string[],
  stdinData: string,
  options: ExecOptions = {},
): Promise<ExecResult> {
  const { cwd, timeout = 120_000, maxBuffer = 10 * 1024 * 1024, env: extraEnv, signal } = options;

  if (signal?.aborted) {
    return {
      success: false,
      stdout: "",
      stderr: "Command cancelled.",
      exitCode: null,
      timedOut: false,
    };
  }

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let cancelled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeout);

    const onExternalAbort = () => {
      cancelled = true;
      child.kill("SIGTERM");
    };
    signal?.addEventListener("abort", onExternalAbort, { once: true });

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onExternalAbort);
    };

    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");

    child.stdout.on("data", (chunk: string) => {
      if (stdout.length < maxBuffer) stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < maxBuffer) stderr += chunk;
    });

    child.on("close", (code) => {
      cleanup();
      resolve({
        success: code === 0 && !cancelled,
        stdout,
        stderr: timedOut ? "Command timed out" : cancelled ? "Command cancelled." : stderr,
        exitCode: code,
        timedOut,
      });
    });

    child.on("error", (err) => {
      cleanup();
      resolve({
        success: false,
        stdout,
        stderr: err.message,
        exitCode: null,
        timedOut: false,
      });
    });

    child.stdin.on("error", () => {});
    child.stdin.write(stdinData);
    child.stdin.end();
  });
}
