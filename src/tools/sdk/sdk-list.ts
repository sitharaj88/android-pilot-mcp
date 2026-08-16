import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface SdkListArgs {
  installed: boolean;
}

export async function sdkList(
  args: SdkListArgs,
  env: Environment,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  const sdkArgs = args.installed ? ["--list_installed"] : ["--list"];

  const result = await executeCommand(env.sdkmanagerPath, sdkArgs, {
    timeout: 30_000,
    signal: extra.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to list SDK packages.\n\n${result.stderr}`);
  }

  return textResponse(
    args.installed
      ? `Installed SDK packages:\n\n${result.stdout}`
      : `Available SDK packages:\n\n${result.stdout}`,
  );
}
