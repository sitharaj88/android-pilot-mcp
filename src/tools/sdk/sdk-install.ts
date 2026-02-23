import { executeCommandWithStdin } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateSdkPackage } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface SdkInstallArgs {
  packages: string[];
}

export async function sdkInstall(args: SdkInstallArgs, env: Environment) {
  const packages = args.packages.map((p) => validateSdkPackage(p));

  // Auto-accept licenses by piping "y" responses
  const result = await executeCommandWithStdin(env.sdkmanagerPath, packages, "y\n".repeat(100), {
    timeout: 300_000,
  });

  if (!result.success) {
    return errorResponse(
      `Failed to install SDK package(s).\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
    );
  }

  return textResponse(`SDK package(s) installed: ${packages.join(", ")}\n\n${result.stdout}`);
}
