import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { validatePackageName } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface DeeplinkTestArgs {
  uri: string;
  packageName?: string;
  deviceId?: string;
}

export async function deeplinkTest(args: DeeplinkTestArgs, env: Environment) {
  if (args.packageName) {
    validatePackageName(args.packageName);
  }

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", args.uri);

  if (args.packageName) {
    adbArgs.push("-p", args.packageName);
  }

  const result = await executeCommand(env.adbPath, adbArgs, {
    timeout: 15_000,
  });

  if (!result.success || result.stdout.includes("Error")) {
    return errorResponse(`Deep link failed for: ${args.uri}\n\n${result.stdout}\n${result.stderr}`);
  }

  return textResponse(
    `Deep link opened: ${args.uri}${args.packageName ? ` (in ${args.packageName})` : ""}\n\n${result.stdout}`,
  );
}
