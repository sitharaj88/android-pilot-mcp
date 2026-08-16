import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { executeCommandWithStdin } from "../../executor.js";
import { Environment } from "../../types.js";
import { validateSdkPackage } from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

interface SdkInstallArgs {
  packages: string[];
}

const PROGRESS_INTERVAL_MS = 10_000;

export async function sdkInstall(
  args: SdkInstallArgs,
  env: Environment,
  server: McpServer,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  const packages = args.packages.map((p) => validateSdkPackage(p));

  if (server.server.getClientCapabilities()?.elicitation) {
    const elicitResult = await server.server.elicitInput({
      message:
        `About to install the following SDK package(s): ${packages.join(", ")}.\n` +
        `This will download files from Google's Android SDK repository and automatically ` +
        `accept any required SDK licenses on your behalf. Continue?`,
      requestedSchema: {
        type: "object",
        properties: {
          confirm: {
            type: "boolean",
            title: "Confirm installation",
            description: "Proceed with installing the package(s) and auto-accepting licenses",
          },
        },
        required: ["confirm"],
      },
    });

    if (elicitResult.action !== "accept" || elicitResult.content?.confirm !== true) {
      return errorResponse("SDK install cancelled by user.");
    }
  }

  const progressToken = extra._meta?.progressToken;
  const startedAt = Date.now();
  let progress = 0;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  if (progressToken !== undefined) {
    heartbeat = setInterval(() => {
      progress += 1;
      const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
      void extra
        .sendNotification({
          method: "notifications/progress",
          params: {
            progressToken,
            progress,
            message: `Installing SDK package(s)... ${elapsedSeconds}s elapsed`,
          },
        })
        .catch(() => {});
    }, PROGRESS_INTERVAL_MS);
  }

  try {
    // Auto-accept licenses by piping "y" responses
    const result = await executeCommandWithStdin(env.sdkmanagerPath, packages, "y\n".repeat(100), {
      timeout: 300_000,
      signal: extra.signal,
    });

    if (!result.success) {
      return errorResponse(
        `Failed to install SDK package(s).\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`,
      );
    }

    return textResponse(`SDK package(s) installed: ${packages.join(", ")}\n\n${result.stdout}`);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
}
