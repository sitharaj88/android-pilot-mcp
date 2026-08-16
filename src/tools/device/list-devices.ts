import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { structuredResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

export interface DeviceInfo {
  id: string;
  state: string;
  type?: string;
  model?: string;
}

// Matches real "adb devices" rows (SERIAL <whitespace> STATE ...), which excludes the
// "List of devices attached" header and any daemon-startup noise lines (e.g. "* daemon
// started successfully") that adb may print before the device list.
const DEVICE_LINE_RE =
  /^\S+\s+(device|offline|unauthorized|bootloader|recovery|sideload|host|no permissions|connecting|authorizing)\b/;

export async function listDevices(env: Environment, extra?: ToolExtra): Promise<ToolResponse> {
  const result = await executeCommand(env.adbPath, ["devices", "-l"], {
    timeout: 10_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to list devices.\n\n${result.stderr}`);
  }

  const lines = result.stdout.split("\n");
  const devices: DeviceInfo[] = lines
    .filter((line) => DEVICE_LINE_RE.test(line.trim()))
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const id = parts[0];
      const state = parts[1];
      const props: Record<string, string> = {};
      for (const part of parts.slice(2)) {
        const [key, value] = part.split(":");
        if (key && value) props[key] = value;
      }
      return {
        id,
        state,
        type: id.startsWith("emulator-") ? "emulator" : "device",
        model: props["model"],
      };
    });

  const text =
    devices.length === 0
      ? "No devices connected."
      : `Found ${devices.length} device(s):\n\n${devices.map((d) => `- ${d.id} (${d.state}) type:${d.type} model:${d.model ?? "unknown"}`).join("\n")}`;

  return structuredResponse(text, { devices });
}
