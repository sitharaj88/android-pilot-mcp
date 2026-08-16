import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { intentSend } from "./intent-send.js";
import { broadcastSend } from "./broadcast-send.js";
import { deeplinkTest } from "./deeplink-test.js";

export function registerIntentTools(server: McpServer, env: Environment): void {
  server.registerTool(
    "intent_send",
    {
      title: "Send Intent",
      description:
        "Send an Android intent to start an activity with optional action, data URI, component, and extras",
      inputSchema: {
        action: z.string().describe("Intent action, e.g. 'android.intent.action.VIEW'"),
        data: z.string().optional().describe("Intent data URI, e.g. 'https://example.com'"),
        component: z
          .string()
          .optional()
          .describe("Target component, e.g. 'com.example/.MainActivity'"),
        extras: z
          .record(z.string(), z.string())
          .optional()
          .describe("String extras as key-value pairs"),
        flags: z
          .array(z.string())
          .optional()
          .describe("Intent flags, e.g. ['0x10000000'] for FLAG_ACTIVITY_NEW_TASK"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => intentSend(args, env, extra)),
  );

  server.registerTool(
    "broadcast_send",
    {
      title: "Send Broadcast",
      description: "Send an Android broadcast intent",
      inputSchema: {
        action: z.string().describe("Broadcast action, e.g. 'com.example.MY_ACTION'"),
        component: z.string().optional().describe("Target component for explicit broadcast"),
        extras: z
          .record(z.string(), z.string())
          .optional()
          .describe("String extras as key-value pairs"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => broadcastSend(args, env, extra)),
  );

  server.registerTool(
    "deeplink_test",
    {
      title: "Test Deep Link",
      description:
        "Test a deep link URI on a connected Android device. Opens the URI with ACTION_VIEW",
      inputSchema: {
        uri: z
          .string()
          .describe(
            "Deep link URI to test, e.g. 'myapp://profile/123' or 'https://example.com/path'",
          ),
        packageName: z
          .string()
          .optional()
          .describe("Restrict to a specific app package. If omitted, Android chooser may appear"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => deeplinkTest(args, env, extra)),
  );
}
