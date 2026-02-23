import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { logcatRead } from "./logcat.js";
import { logcatClear } from "./logcat-clear.js";
import { deviceScreenshot } from "./screenshot.js";
import { deviceInfo } from "./device-info.js";
import { deviceShell } from "./device-shell.js";
import { uiDump } from "./ui-dump.js";
import { screenRecord } from "./screen-record.js";

export function registerDebugTools(server: McpServer, env: Environment): void {
  server.tool(
    "logcat_read",
    "Read Android logcat output with optional filtering by tag, priority level, or search string",
    {
      deviceId: z.string().optional().describe("Target device serial"),
      tag: z.string().optional().describe("Filter by log tag, e.g. 'MyApp'"),
      priority: z
        .enum(["V", "D", "I", "W", "E", "F"])
        .optional()
        .describe(
          "Minimum log priority level (V=Verbose, D=Debug, I=Info, W=Warn, E=Error, F=Fatal)",
        ),
      grep: z
        .string()
        .optional()
        .describe("Filter output lines containing this string (case-insensitive)"),
      lines: z.number().default(100).describe("Maximum number of recent log lines to return"),
      since: z
        .string()
        .optional()
        .describe("Only show logs since this time, e.g. '2024-01-01 12:00:00.000'"),
    },
    withErrorHandling(async (args) => logcatRead(args, env)),
  );

  server.tool(
    "logcat_clear",
    "Clear the logcat buffer on a connected Android device",
    {
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => logcatClear(args, env)),
  );

  server.tool(
    "device_screenshot",
    "Capture a screenshot from a connected Android device and return it as a base64-encoded PNG",
    {
      deviceId: z.string().optional().describe("Target device serial"),
      savePath: z
        .string()
        .optional()
        .describe("Local path to save the screenshot file. If omitted, returns base64 data only"),
    },
    withErrorHandling(async (args) => deviceScreenshot(args, env)),
  );

  server.tool(
    "device_info",
    "Get detailed information about a connected Android device including model, OS version, screen density, and more",
    {
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => deviceInfo(args, env)),
  );

  server.tool(
    "device_shell",
    "Execute an arbitrary ADB shell command on a connected Android device. Use with caution",
    {
      command: z.string().describe("Shell command to execute on the device"),
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => deviceShell(args, env)),
  );

  server.tool(
    "ui_dump",
    "Dump the current screen's UI hierarchy (view tree) as XML using UI Automator. Useful for understanding what's displayed on screen",
    {
      deviceId: z.string().optional().describe("Target device serial"),
      compressed: z.boolean().default(true).describe("Use compressed format for smaller output"),
    },
    withErrorHandling(async (args) => uiDump(args, env)),
  );

  server.tool(
    "screen_record",
    "Record the device screen as an MP4 video and save it locally",
    {
      deviceId: z.string().optional().describe("Target device serial"),
      duration: z.number().default(10).describe("Recording duration in seconds (max 180)"),
      savePath: z.string().describe("Local path to save the MP4 recording"),
    },
    withErrorHandling(async (args) => screenRecord(args, env)),
  );
}
