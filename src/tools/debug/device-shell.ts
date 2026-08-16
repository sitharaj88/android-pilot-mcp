import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateDeviceId, validateShellCommand } from "../../utils/validation.js";
import { OUTPUT_LIMITS, truncateOutput } from "../../utils/response.js";
import { DebugToolExtra } from "./types.js";

interface DeviceShellArgs {
  command: string;
  deviceId?: string;
}

/**
 * SECURITY WARNING: This tool executes arbitrary shell commands on the
 * connected Android device. It is intentionally permissive by design.
 * Only basic length and null-byte validation is applied.
 */
export async function deviceShell(args: DeviceShellArgs, env: Environment, extra: DebugToolExtra) {
  const command = validateShellCommand(args.command);
  if (args.deviceId) validateDeviceId(args.deviceId);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", command);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 30_000,
    signal: extra.signal,
  });

  const { text: output, truncated } = truncateOutput(result.stdout, OUTPUT_LIMITS.shellOutput);

  const text = [
    result.success ? "" : `[Exit code: ${result.exitCode}]\n`,
    output,
    truncated ? "\n\n[Output truncated at 10KB]" : "",
    result.stderr ? `\n\nSTDERR:\n${result.stderr}` : "",
  ]
    .filter(Boolean)
    .join("");

  return {
    content: [{ type: "text" as const, text: text || "(no output)" }],
    isError: !result.success,
  };
}
