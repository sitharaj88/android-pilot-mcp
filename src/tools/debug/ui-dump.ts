import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import {
  textResponse,
  errorResponse,
  truncateOutput,
  OUTPUT_LIMITS,
} from "../../utils/response.js";
import { validateDeviceId } from "../../utils/validation.js";
import { cleanupRemoteFile, uniqueRemotePath } from "./remote-file.js";
import { DebugToolExtra } from "./types.js";

interface UiDumpArgs {
  deviceId?: string;
  compressed: boolean;
}

export async function uiDump(args: UiDumpArgs, env: Environment, extra?: DebugToolExtra) {
  if (args.deviceId) validateDeviceId(args.deviceId);

  const baseArgs: string[] = [];
  if (args.deviceId) baseArgs.push("-s", args.deviceId);

  // Dump UI hierarchy to device
  const dumpPath = uniqueRemotePath("window_dump", "xml");
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
    { timeout: 15_000, signal: extra?.signal },
  );

  if (!dumpResult.success) {
    await cleanupRemoteFile(env.adbPath, baseArgs, dumpPath);
    return errorResponse(`Failed to dump UI hierarchy.\n\n${dumpResult.stderr}`);
  }

  // Read the dump file
  const catResult = await executeCommand(env.adbPath, [...baseArgs, "shell", "cat", dumpPath], {
    timeout: 10_000,
    signal: extra?.signal,
  });

  // Clean up
  await cleanupRemoteFile(env.adbPath, baseArgs, dumpPath);

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
