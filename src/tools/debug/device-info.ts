import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { structuredResponse } from "../../utils/response.js";
import { validateDeviceId } from "../../utils/validation.js";
import { DebugToolExtra } from "./types.js";

interface DeviceInfoArgs {
  deviceId?: string;
}

export interface DeviceInfoData {
  model: string | null;
  manufacturer: string | null;
  androidVersion: string | null;
  sdkLevel: number | null;
  cpuAbi: string | null;
  screenDensity: string | null;
  buildId: string | null;
  buildType: string | null;
  hardware: string | null;
  heapSize: string | null;
  batteryLevel: number | null;
  screenResolution: string | null;
}

const PROPERTIES = [
  ["ro.product.model", "model", "Model"],
  ["ro.product.manufacturer", "manufacturer", "Manufacturer"],
  ["ro.build.version.release", "androidVersion", "Android Version"],
  ["ro.build.version.sdk", "sdkLevel", "API Level"],
  ["ro.product.cpu.abi", "cpuAbi", "CPU ABI"],
  ["ro.sf.lcd_density", "screenDensity", "Screen Density"],
  ["ro.build.display.id", "buildId", "Build ID"],
  ["ro.build.type", "buildType", "Build Type"],
  ["ro.hardware", "hardware", "Hardware"],
  ["dalvik.vm.heapsize", "heapSize", "Heap Size"],
] as const satisfies ReadonlyArray<readonly [string, keyof DeviceInfoData, string]>;

export async function deviceInfo(args: DeviceInfoArgs, env: Environment, extra?: DebugToolExtra) {
  if (args.deviceId) validateDeviceId(args.deviceId);

  const baseArgs: string[] = [];
  if (args.deviceId) baseArgs.push("-s", args.deviceId);

  const lines: string[] = [];
  const data: DeviceInfoData = {
    model: null,
    manufacturer: null,
    androidVersion: null,
    sdkLevel: null,
    cpuAbi: null,
    screenDensity: null,
    buildId: null,
    buildType: null,
    hardware: null,
    heapSize: null,
    batteryLevel: null,
    screenResolution: null,
  };

  for (const [prop, key, label] of PROPERTIES) {
    const result = await executeCommand(env.adbPath, [...baseArgs, "shell", "getprop", prop], {
      timeout: 5_000,
      signal: extra?.signal,
    });
    const value = result.success ? result.stdout.trim() : "";
    lines.push(`${label}: ${value || "N/A"}`);

    if (!value) continue;
    if (key === "sdkLevel") {
      const parsed = Number.parseInt(value, 10);
      data.sdkLevel = Number.isNaN(parsed) ? null : parsed;
    } else {
      data[key] = value;
    }
  }

  // Get battery info
  const batteryResult = await executeCommand(
    env.adbPath,
    [...baseArgs, "shell", "dumpsys", "battery"],
    { timeout: 5_000, signal: extra?.signal },
  );
  if (batteryResult.success) {
    const levelMatch = batteryResult.stdout.match(/level:\s*(\d+)/);
    if (levelMatch) {
      lines.push(`Battery Level: ${levelMatch[1]}%`);
      data.batteryLevel = Number.parseInt(levelMatch[1], 10);
    }
  }

  // Get screen resolution
  const wmResult = await executeCommand(env.adbPath, [...baseArgs, "shell", "wm", "size"], {
    timeout: 5_000,
    signal: extra?.signal,
  });
  if (wmResult.success) {
    const sizeMatch = wmResult.stdout.match(/Physical size:\s*([\dx]+)/);
    if (sizeMatch) {
      lines.push(`Screen Resolution: ${sizeMatch[1]}`);
      data.screenResolution = sizeMatch[1];
    }
  }

  return structuredResponse(lines.join("\n"), { ...data });
}
