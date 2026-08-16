import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateDeviceId } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

interface WifiConnectArgs {
  deviceId?: string;
  port: number;
}

const TCP_MODE_RETRY_ATTEMPTS = 5;
const TCP_MODE_RETRY_DELAY_MS = 1_000;

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return;
  await new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function wifiAdbConnect(
  args: WifiConnectArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const signal = extra?.signal;
  const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
  const baseArgs: string[] = [];
  if (deviceId) baseArgs.push("-s", deviceId);

  // Step 1: Switch device to TCP/IP mode
  const tcpResult = await executeCommand(env.adbPath, [...baseArgs, "tcpip", String(args.port)], {
    timeout: 10_000,
    signal,
  });

  if (!tcpResult.success) {
    return errorResponse(`Failed to switch to TCP/IP mode.\n\n${tcpResult.stderr}`);
  }

  // Step 2: Get device IP address, retrying while adb re-attaches in TCP mode
  let ipResult;
  for (let attempt = 0; attempt < TCP_MODE_RETRY_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      return errorResponse(`WiFi ADB connect cancelled.`);
    }
    await sleep(TCP_MODE_RETRY_DELAY_MS, signal);
    ipResult = await executeCommand(
      env.adbPath,
      [...baseArgs, "shell", "ip", "route", "get", "1"],
      { timeout: 10_000, signal },
    );
    if (ipResult.success && /src\s+[\d.]+/.test(ipResult.stdout)) break;
  }

  if (!ipResult || !ipResult.success) {
    return textResponse(
      `TCP/IP mode enabled on port ${args.port}, but failed to get device IP after ${TCP_MODE_RETRY_ATTEMPTS} attempts.\nUse 'adb connect <ip>:${args.port}' manually.\n\n${ipResult?.stderr ?? ""}`,
    );
  }

  const ipMatch = ipResult.stdout.match(/src\s+([\d.]+)/);
  if (!ipMatch) {
    return textResponse(
      `TCP/IP mode enabled on port ${args.port}, but could not parse device IP from:\n${ipResult.stdout}\nUse 'adb connect <ip>:${args.port}' manually.`,
    );
  }

  const deviceIp = ipMatch[1];

  // Step 3: Connect over WiFi
  const connectResult = await executeCommand(env.adbPath, ["connect", `${deviceIp}:${args.port}`], {
    timeout: 10_000,
    signal,
  });

  if (!connectResult.success || connectResult.stdout.includes("failed")) {
    return errorResponse(
      `TCP/IP enabled but WiFi connection failed.\nDevice IP: ${deviceIp}:${args.port}\n\n${connectResult.stdout}\n${connectResult.stderr}`,
    );
  }

  return textResponse(
    `WiFi ADB connected to ${deviceIp}:${args.port}\nYou can now disconnect the USB cable.\n\n${connectResult.stdout}`,
  );
}

interface WifiDisconnectArgs {
  address?: string;
}

export async function wifiAdbDisconnect(
  args: WifiDisconnectArgs,
  env: Environment,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const adbArgs = args.address ? ["disconnect", args.address] : ["disconnect"];

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Disconnect failed.\n\n${result.stderr}`);
  }

  return textResponse(
    `Disconnected${args.address ? ` from ${args.address}` : " all WiFi devices"}.\n\n${result.stdout}`,
  );
}
