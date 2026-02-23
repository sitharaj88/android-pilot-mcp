import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import {
  textResponse,
  errorResponse,
  truncateOutput,
  OUTPUT_LIMITS,
} from "../../utils/response.js";

interface UiDumpArgs {
  deviceId?: string;
  compressed: boolean;
}

export async function uiDump(args: UiDumpArgs, env: Environment) {
  const baseArgs: string[] = [];
  if (args.deviceId) baseArgs.push("-s", args.deviceId);

  // Dump UI hierarchy to device
  const dumpPath = "/sdcard/window_dump.xml";
  const dumpResult = await executeCommand(
    env.adbPath,
    [
      ...baseArgs,
      "shell",
      "uiautomator",
      "dump",
      ...(args.compressed ? ["--compressed"] : []),
      dumpPath,
    ],
    { timeout: 15_000 },
  );

  if (!dumpResult.success) {
    return errorResponse(`Failed to dump UI hierarchy.\n\n${dumpResult.stderr}`);
  }

  // Read the dump file
  const catResult = await executeCommand(env.adbPath, [...baseArgs, "shell", "cat", dumpPath], {
    timeout: 10_000,
  });

  // Clean up
  await executeCommand(env.adbPath, [...baseArgs, "shell", "rm", dumpPath], {
    timeout: 5_000,
  });

  if (!catResult.success) {
    return errorResponse(`UI dump created but failed to read.\n\n${catResult.stderr}`);
  }

  // Truncate if massive
  const { text: output, truncated } = truncateOutput(catResult.stdout, OUTPUT_LIMITS.xmlDump);

  const truncationNote = truncated
    ? "\n\n[Truncated at 50KB — use compressed=true for smaller output]"
    : "";

  return textResponse(`UI Hierarchy:\n\n${output}${truncationNote}`);
}
