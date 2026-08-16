import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function confirmDestructiveAction(
  server: McpServer,
  message: string,
): Promise<boolean> {
  const capabilities = server.server.getClientCapabilities();
  if (!capabilities?.elicitation) return true;

  const result = await server.server.elicitInput({
    message,
    requestedSchema: {
      type: "object",
      properties: {
        confirm: {
          type: "boolean",
          title: "Confirm",
          description: "Confirm this action",
          default: false,
        },
      },
      required: ["confirm"],
    },
  });

  if (result.action !== "accept") return false;
  return result.content?.confirm === true;
}
