import { executeCommand } from "../../executor.js";

let counter = 0;

export function uniqueRemotePath(prefix: string, extension: string): string {
  counter = (counter + 1) % 1_000_000;
  return `/sdcard/${prefix}_${Date.now()}_${process.pid}_${counter}.${extension}`;
}

export async function cleanupRemoteFile(
  adbPath: string,
  baseArgs: string[],
  remotePath: string,
): Promise<void> {
  await executeCommand(adbPath, [...baseArgs, "shell", "rm", "-f", remotePath], {
    timeout: 5_000,
  });
}
