import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { structuredResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import type { ToolExtra } from "./types.js";

export interface AvdInfo {
  name: string;
  device?: string;
  path?: string;
  target?: string;
}

export function parseAvdList(output: string): AvdInfo[] {
  return output
    .split(/^-+$/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const nameMatch = block.match(/Name:\s*(\S+)/);
      if (!nameMatch) return null;
      const deviceMatch = block.match(/Device:\s*([^\n(]+)/);
      const pathMatch = block.match(/Path:\s*(\S+)/);
      const targetMatch = block.match(/Target:\s*([^\n]+)/);
      const avd: AvdInfo = { name: nameMatch[1] };
      if (deviceMatch) avd.device = deviceMatch[1].trim();
      if (pathMatch) avd.path = pathMatch[1].trim();
      if (targetMatch) avd.target = targetMatch[1].trim();
      return avd;
    })
    .filter((avd): avd is AvdInfo => avd !== null);
}

export async function listAvds(env: Environment, extra?: ToolExtra): Promise<ToolResponse> {
  const result = await executeCommand(env.avdmanagerPath, ["list", "avd"], {
    timeout: 15_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to list AVDs.\n\n${result.stderr}`);
  }

  const avds = parseAvdList(result.stdout);
  const text =
    avds.length === 0
      ? "No AVDs found."
      : `Found ${avds.length} AVD(s):\n\n${avds.map((a) => `- ${a.name}${a.device ? ` (${a.device})` : ""}`).join("\n")}`;

  return structuredResponse(text, { avds });
}
