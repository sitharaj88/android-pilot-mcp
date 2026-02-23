import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { ExecResult, ExecOptions } from "./types.js";

const execFileAsync = promisify(execFile);

export async function executeCommand(
  command: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  const { cwd, timeout = 120_000, maxBuffer = 10 * 1024 * 1024, env: extraEnv } = options;

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout,
      maxBuffer,
      encoding: "utf-8",
      env: { ...process.env, ...extraEnv },
    });
    return { success: true, stdout, stderr, exitCode: 0, timedOut: false };
  } catch (err: unknown) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number;
      killed?: boolean;
      signal?: string;
      message?: string;
    };
    const timedOut = e.killed === true && e.signal === "SIGTERM";
    return {
      success: false,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? (timedOut ? "Command timed out" : (e.message ?? "Unknown error")),
      exitCode: e.code ?? null,
      timedOut,
    };
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
  const { cwd, timeout = 120_000, maxBuffer = 10 * 1024 * 1024, env: extraEnv } = options;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
    }, timeout);

    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");

    child.stdout.on("data", (chunk: string) => {
      if (stdout.length < maxBuffer) stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < maxBuffer) stderr += chunk;
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        stdout,
        stderr: killed ? "Command timed out" : stderr,
        exitCode: code,
        timedOut: killed,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout,
        stderr: err.message,
        exitCode: null,
        timedOut: false,
      });
    });

    child.stdin.write(stdinData);
    child.stdin.end();
  });
}
