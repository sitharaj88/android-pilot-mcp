import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateShellCommand } from "../../utils/validation.js";
import { OUTPUT_LIMITS, truncateOutput } from "../../utils/response.js";

interface DeviceShellArgs {
  command: string;
  deviceId?: string;
}

/**
 * SECURITY WARNING: This tool executes arbitrary shell commands on the
 * connected Android device. It is intentionally permissive by design.
 * Only basic length and null-byte validation is applied.
 */
export async function deviceShell(args: DeviceShellArgs, env: Environment) {
  const command = validateShellCommand(args.command);

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", command);

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 30_000,
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
