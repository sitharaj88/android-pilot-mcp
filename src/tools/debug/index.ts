import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { logcatRead } from "./logcat.js";
import { logcatClear } from "./logcat-clear.js";
import { deviceScreenshot } from "./screenshot.js";
import { deviceInfo } from "./device-info.js";
import { deviceShell } from "./device-shell.js";
import { uiDump } from "./ui-dump.js";
import { screenRecord } from "./screen-record.js";
import {
  logcatReadInputSchema,
  logcatClearInputSchema,
  deviceScreenshotInputSchema,
  deviceInfoInputSchema,
  deviceInfoOutputSchema,
  deviceShellInputSchema,
  uiDumpInputSchema,
  screenRecordInputSchema,
} from "./schemas.js";

export function registerDebugTools(server: McpServer, env: Environment): void {
  server.registerTool(
    "logcat_read",
    {
      title: "Read Logcat",
      description:
        "Read Android logcat output with optional filtering by tag, priority level, or search string",
      inputSchema: logcatReadInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => logcatRead(args, env, extra)),
  );

  server.registerTool(
    "logcat_clear",
    {
      title: "Clear Logcat",
      description: "Clear the logcat buffer on a connected Android device",
      inputSchema: logcatClearInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => logcatClear(args, env, extra)),
  );

  server.registerTool(
    "device_screenshot",
    {
      title: "Capture Screenshot",
      description:
        "Capture a screenshot from a connected Android device and return it as a base64-encoded PNG",
      inputSchema: deviceScreenshotInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => deviceScreenshot(args, env, extra)),
  );

  server.registerTool(
    "device_info",
    {
      title: "Get Device Info",
      description:
        "Get detailed information about a connected Android device including model, OS version, screen density, and more",
      inputSchema: deviceInfoInputSchema,
      outputSchema: deviceInfoOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => deviceInfo(args, env, extra)),
  );

  server.registerTool(
    "device_shell",
    {
      title: "Run Shell Command",
      description:
        "Execute an arbitrary ADB shell command on a connected Android device. Use with caution",
      inputSchema: deviceShellInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => deviceShell(args, env, extra)),
  );

  server.registerTool(
    "ui_dump",
    {
      title: "Dump UI Hierarchy",
      description:
        "Dump the current screen's UI hierarchy (view tree) as XML using UI Automator. Useful for understanding what's displayed on screen",
      inputSchema: uiDumpInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => uiDump(args, env, extra)),
  );

  server.registerTool(
    "screen_record",
    {
      title: "Record Screen",
      description: "Record the device screen as an MP4 video and save it locally",
      inputSchema: screenRecordInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => screenRecord(args, env, extra)),
  );
}
