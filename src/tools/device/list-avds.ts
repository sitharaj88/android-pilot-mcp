import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

export async function listAvds(env: Environment) {
  const result = await executeCommand(env.avdmanagerPath, ["list", "avd"], {
    timeout: 15_000,
  });

  if (!result.success) {
    return errorResponse(`Failed to list AVDs.\n\n${result.stderr}`);
  }

  return textResponse(result.stdout || "No AVDs found.");
}
