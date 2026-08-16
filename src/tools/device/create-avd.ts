import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeCommand, executeCommandWithStdin } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateSafeName, validateSdkPackage } from "../../utils/validation.js";
import { textResponse, errorResponse, ToolResponse } from "../../utils/response.js";
import { confirmDestructiveAction } from "./elicit.js";
import { parseAvdList } from "./list-avds.js";
import type { ToolExtra } from "./types.js";

interface CreateAvdArgs {
  name: string;
  package: string;
  device: string;
  force: boolean;
}

export async function createAvd(
  args: CreateAvdArgs,
  env: Environment,
  server: McpServer,
  extra?: ToolExtra,
): Promise<ToolResponse> {
  const name = validateSafeName(args.name, "AVD name");
  const pkg = validateSdkPackage(args.package);
  const device = validateSafeName(args.device, "Device profile");

  if (args.force) {
    const existing = await executeCommand(env.avdmanagerPath, ["list", "avd"], {
      timeout: 15_000,
      signal: extra?.signal,
    });
    // Fail closed: if we can't verify whether the AVD already exists, treat it as
    // potentially-overwriting so the user still gets a confirmation prompt.
    const overwrites = existing.success
      ? parseAvdList(existing.stdout).some((avd) => avd.name === name)
      : true;
    if (overwrites) {
      const confirmed = await confirmDestructiveAction(
        server,
        `An AVD named "${name}" already exists and will be overwritten. Continue?`,
      );
      if (!confirmed) {
        return errorResponse(`Create AVD "${name}" cancelled by user.`);
      }
    }
  }

  const cmdArgs = ["create", "avd", "-n", name, "-k", pkg, "-d", device];
  if (args.force) cmdArgs.push("--force");

  // Pipe "no" to skip custom hardware profile prompt
  const result = await executeCommandWithStdin(env.avdmanagerPath, cmdArgs, "no\n", {
    timeout: 30_000,
    signal: extra?.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to create AVD "${name}".\n\n${result.stderr}`);
  }

  return textResponse(`AVD "${name}" created successfully.\n\n${result.stdout}`);
}
