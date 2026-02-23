import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse } from "../../utils/response.js";

interface DeviceInfoArgs {
  deviceId?: string;
}

const PROPERTIES = [
  ["ro.product.model", "Model"],
  ["ro.product.manufacturer", "Manufacturer"],
  ["ro.build.version.release", "Android Version"],
  ["ro.build.version.sdk", "API Level"],
  ["ro.product.cpu.abi", "CPU ABI"],
  ["ro.sf.lcd_density", "Screen Density"],
  ["ro.build.display.id", "Build ID"],
  ["ro.build.type", "Build Type"],
  ["ro.hardware", "Hardware"],
  ["dalvik.vm.heapsize", "Heap Size"],
] as const;

export async function deviceInfo(args: DeviceInfoArgs, env: Environment) {
  const baseArgs: string[] = [];
  if (args.deviceId) baseArgs.push("-s", args.deviceId);

  const lines: string[] = [];

  for (const [prop, label] of PROPERTIES) {
    const result = await executeCommand(env.adbPath, [...baseArgs, "shell", "getprop", prop], {
      timeout: 5_000,
    });
    const value = result.success ? result.stdout.trim() : "N/A";
    lines.push(`${label}: ${value}`);
  }

  // Get battery info
  const batteryResult = await executeCommand(
    env.adbPath,
    [...baseArgs, "shell", "dumpsys", "battery"],
    { timeout: 5_000 },
  );
  if (batteryResult.success) {
    const levelMatch = batteryResult.stdout.match(/level:\s*(\d+)/);
    if (levelMatch) lines.push(`Battery Level: ${levelMatch[1]}%`);
  }

  // Get screen resolution
  const wmResult = await executeCommand(env.adbPath, [...baseArgs, "shell", "wm", "size"], {
    timeout: 5_000,
  });
  if (wmResult.success) {
    const sizeMatch = wmResult.stdout.match(/Physical size:\s*([\dx]+)/);
    if (sizeMatch) lines.push(`Screen Resolution: ${sizeMatch[1]}`);
  }

  return textResponse(lines.join("\n"));
}
