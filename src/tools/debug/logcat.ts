import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface LogcatReadArgs {
  deviceId?: string;
  tag?: string;
  priority?: "V" | "D" | "I" | "W" | "E" | "F";
  grep?: string;
  lines: number;
  since?: string;
}

export async function logcatRead(args: LogcatReadArgs, env: Environment) {
  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("logcat", "-d");

  if (args.since) {
    adbArgs.push("-T", args.since);
  } else {
    adbArgs.push("-t", String(args.lines));
  }

  // Tag and priority filter
  if (args.tag && args.priority) {
    adbArgs.push(`${args.tag}:${args.priority}`, "*:S");
  } else if (args.tag) {
    adbArgs.push(`${args.tag}:V`, "*:S");
  } else if (args.priority) {
    adbArgs.push(`*:${args.priority}`);
  }

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to read logcat.\n\n${result.stderr}`);
  }

  let output = result.stdout;

  // Apply grep filter in-process
  if (args.grep) {
    const filterLower = args.grep.toLowerCase();
    output = output
      .split("\n")
      .filter((line) => line.toLowerCase().includes(filterLower))
      .join("\n");
  }

  return textResponse(output.trim() || "No matching log entries found.");
}
