import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface WifiConnectArgs {
  deviceId?: string;
  port: number;
}

export async function wifiAdbConnect(args: WifiConnectArgs, env: Environment) {
  const baseArgs: string[] = [];
  if (args.deviceId) baseArgs.push("-s", args.deviceId);

  // Step 1: Switch device to TCP/IP mode
  const tcpResult = await executeCommand(env.adbPath, [...baseArgs, "tcpip", String(args.port)], {
    timeout: 10_000,
  });

  if (!tcpResult.success) {
    return errorResponse(`Failed to switch to TCP/IP mode.\n\n${tcpResult.stderr}`);
  }

  // Wait for device to restart in TCP mode
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Get device IP address
  const ipResult = await executeCommand(
    env.adbPath,
    [...baseArgs, "shell", "ip", "route", "get", "1"],
    { timeout: 10_000 },
  );

  if (!ipResult.success) {
    return textResponse(
      `TCP/IP mode enabled on port ${args.port}, but failed to get device IP.\nUse 'adb connect <ip>:${args.port}' manually.\n\n${ipResult.stderr}`,
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

export async function wifiAdbDisconnect(args: WifiDisconnectArgs, env: Environment) {
  const adbArgs = args.address ? ["disconnect", args.address] : ["disconnect"];

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 10_000,
  });

  if (!result.success) {
    return errorResponse(`Disconnect failed.\n\n${result.stderr}`);
  }

  return textResponse(
    `Disconnected${args.address ? ` from ${args.address}` : " all WiFi devices"}.\n\n${result.stdout}`,
  );
}
