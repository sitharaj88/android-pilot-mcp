import { executeCommandWithStdin } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateSafeName, validateSdkPackage } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface CreateAvdArgs {
  name: string;
  package: string;
  device: string;
  force: boolean;
}

export async function createAvd(args: CreateAvdArgs, env: Environment) {
  const name = validateSafeName(args.name, "AVD name");
  const pkg = validateSdkPackage(args.package);
  const device = validateSafeName(args.device, "Device profile");

  const cmdArgs = ["create", "avd", "-n", name, "-k", pkg, "-d", device];
  if (args.force) cmdArgs.push("--force");

  // Pipe "no" to skip custom hardware profile prompt
  const result = await executeCommandWithStdin(env.avdmanagerPath, cmdArgs, "no\n", {
    timeout: 30_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to create AVD "${name}".\n\n${result.stderr}`);
  }

  return textResponse(`AVD "${name}" created successfully.\n\n${result.stdout}`);
}
