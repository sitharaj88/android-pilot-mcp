import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

export async function listDevices(env: Environment) {
  const result = await executeCommand(env.adbPath, ["devices", "-l"], {
    timeout: 10_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to list devices.\n\n${result.stderr}`);
  }

  const lines = result.stdout.trim().split("\n").slice(1); // skip header
  const devices = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const serial = parts[0];
      const state = parts[1];
      const props: Record<string, string> = {};
      for (const part of parts.slice(2)) {
        const [key, value] = part.split(":");
        if (key && value) props[key] = value;
      }
      return { serial, state, props };
    });

  return textResponse(
    devices.length === 0
      ? "No devices connected."
      : `Found ${devices.length} device(s):\n\n${devices.map((d) => `- ${d.serial} (${d.state}) model:${d.props["model"] ?? "unknown"} product:${d.props["product"] ?? "unknown"}`).join("\n")}`,
  );
}
