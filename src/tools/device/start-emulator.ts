import { spawnDetached, executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateSafeName } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface StartEmulatorArgs {
  avdName: string;
  coldBoot: boolean;
  noWindow: boolean;
  wipeData: boolean;
}

export async function startEmulator(args: StartEmulatorArgs, env: Environment) {
  const avdName = validateSafeName(args.avdName, "AVD name");

  const emulatorArgs = ["-avd", avdName];
  if (args.coldBoot) emulatorArgs.push("-no-snapshot-load");
  if (args.noWindow) emulatorArgs.push("-no-window");
  if (args.wipeData) emulatorArgs.push("-wipe-data");

  const { pid } = spawnDetached(env.emulatorPath, emulatorArgs);

  // Poll for boot completion
  const maxWait = 120_000;
  const pollInterval = 3_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const bootCheck = await executeCommand(
      env.adbPath,
      ["shell", "getprop", "sys.boot_completed"],
      { timeout: 5_000 },
    );

    if (bootCheck.success && bootCheck.stdout.trim() === "1") {
      // Get the device serial
      const devicesResult = await executeCommand(env.adbPath, ["devices"], {
        timeout: 5_000,
      });
      const serials = devicesResult.stdout
        .split("\n")
        .filter((l) => l.includes("emulator"))
        .map((l) => l.split("\t")[0]);

      return textResponse(
        `Emulator "${avdName}" booted successfully (PID: ${pid}).\nDevice serial(s): ${serials.join(", ") || "unknown"}`,
      );
    }
  }

  return errorResponse(
    `Emulator "${avdName}" started (PID: ${pid}) but did not finish booting within ${maxWait / 1000} seconds. It may still be booting.`,
  );
}
