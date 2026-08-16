import { spawnDetached, executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateSafeName } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

interface StartEmulatorArgs {
  avdName: string;
  coldBoot: boolean;
  noWindow: boolean;
  wipeData: boolean;
}

const MAX_WAIT_MS = 120_000;
const POLL_INTERVAL_MS = 3_000;

async function listEmulatorSerials(
  env: Environment,
  signal?: AbortSignal,
): Promise<Set<string> | null> {
  const result = await executeCommand(env.adbPath, ["devices"], { timeout: 5_000, signal });
  if (!result.success) return null;

  const serials = result.stdout
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter((id): id is string => Boolean(id) && id.startsWith("emulator-"));

  return new Set(serials);
}

export async function startEmulator(
  args: StartEmulatorArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const avdName = validateSafeName(args.avdName, "AVD name");
  const signal = extra?.signal;
  const progressToken = extra?._meta?.progressToken;
  const totalSteps = Math.ceil(MAX_WAIT_MS / POLL_INTERVAL_MS);
  let step = 0;

  const reportProgress = async (message: string): Promise<void> => {
    if (progressToken === undefined || !extra?.sendNotification) return;
    step += 1;
    await extra.sendNotification({
      method: "notifications/progress",
      params: { progressToken, progress: step, total: totalSteps, message },
    });
  };

  const beforeSerials = await listEmulatorSerials(env, signal);
  if (beforeSerials === null) {
    return errorResponse(
      `Unable to list current adb devices before launching "${avdName}" (adb devices failed). ` +
        "Ensure adb is reachable and try again.",
    );
  }

  const emulatorArgs = ["-avd", avdName];
  if (args.coldBoot) emulatorArgs.push("-no-snapshot-load");
  if (args.noWindow) emulatorArgs.push("-no-window");
  if (args.wipeData) emulatorArgs.push("-wipe-data");

  const { pid } = spawnDetached(env.emulatorPath, emulatorArgs);

  const startTime = Date.now();
  let serial: string | undefined;

  while (Date.now() - startTime < MAX_WAIT_MS) {
    if (signal?.aborted) {
      return errorResponse(`Emulator "${avdName}" launch cancelled (PID: ${pid}).`);
    }

    await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));

    if (signal?.aborted) {
      return errorResponse(`Emulator "${avdName}" launch cancelled (PID: ${pid}).`);
    }

    if (!serial) {
      const currentSerials = await listEmulatorSerials(env, signal);
      if (currentSerials === null) {
        await reportProgress("Waiting for emulator to attach to adb (adb devices failed)");
        continue;
      }
      serial = [...currentSerials].find((s) => !beforeSerials.has(s));
      await reportProgress(
        serial
          ? `Emulator attached as ${serial}, waiting for boot`
          : "Waiting for emulator to attach to adb",
      );
      continue;
    }

    const bootCheck = await executeCommand(
      env.adbPath,
      ["-s", serial, "shell", "getprop", "sys.boot_completed"],
      { timeout: 5_000, signal },
    );

    if (bootCheck.success && bootCheck.stdout.trim() === "1") {
      return textResponse(
        `Emulator "${avdName}" booted successfully (PID: ${pid}).\nDevice serial: ${serial}`,
      );
    }

    await reportProgress(`Waiting for ${serial} to finish booting`);
  }

  return errorResponse(
    `Emulator "${avdName}" started (PID: ${pid}) but did not finish booting within ${MAX_WAIT_MS / 1000} seconds.` +
      (serial ? ` Device serial: ${serial}.` : " It never attached to adb.") +
      " It may still be booting.",
  );
}
