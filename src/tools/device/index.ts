import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { listDevices } from "./list-devices.js";
import { listAvds } from "./list-avds.js";
import { createAvd } from "./create-avd.js";
import { startEmulator } from "./start-emulator.js";
import { stopEmulator } from "./stop-emulator.js";
import { installApk } from "./install-apk.js";
import { launchApp } from "./launch-app.js";
import { stopApp } from "./stop-app.js";
import { appClearData } from "./app-clear-data.js";
import { appPermission, listAppPermissions } from "./app-permissions.js";
import { wifiAdbConnect, wifiAdbDisconnect } from "./wifi-adb.js";
import { filePush, filePull } from "./file-transfer.js";

export function registerDeviceTools(server: McpServer, env: Environment): void {
  server.registerTool(
    "device_list",
    {
      title: "List Devices",
      description: "List all connected Android devices and running emulators with their status",
      inputSchema: {},
      outputSchema: {
        devices: z.array(
          z.object({
            id: z.string(),
            state: z.string(),
            type: z.string().optional(),
            model: z.string().optional(),
          }),
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (_args, extra) => listDevices(env, extra)),
  );

  server.registerTool(
    "avd_list",
    {
      title: "List AVDs",
      description: "List all available Android Virtual Devices (AVDs)",
      inputSchema: {},
      outputSchema: {
        avds: z.array(
          z.object({
            name: z.string(),
            device: z.string().optional(),
            path: z.string().optional(),
            target: z.string().optional(),
          }),
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (_args, extra) => listAvds(env, extra)),
  );

  server.registerTool(
    "avd_create",
    {
      title: "Create AVD",
      description: "Create a new Android Virtual Device (AVD) with specified configuration",
      inputSchema: {
        name: z.string().describe("Name for the new AVD"),
        package: z
          .string()
          .describe("System image package, e.g. 'system-images;android-35;google_apis;arm64-v8a'"),
        device: z
          .string()
          .default("pixel_6")
          .describe("Hardware device profile, e.g. 'pixel_6', 'pixel_7_pro'"),
        force: z.boolean().default(false).describe("Overwrite existing AVD with the same name"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => createAvd(args, env, server, extra)),
  );

  server.registerTool(
    "emulator_start",
    {
      title: "Start Emulator",
      description:
        "Start an Android emulator by AVD name. Returns once the device has booted or after timeout",
      inputSchema: {
        avdName: z.string().describe("Name of the AVD to start"),
        coldBoot: z
          .boolean()
          .default(false)
          .describe("Force a cold boot instead of using snapshot"),
        noWindow: z
          .boolean()
          .default(false)
          .describe("Run emulator without a GUI window (headless)"),
        wipeData: z.boolean().default(false).describe("Reset emulator to factory state"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => startEmulator(args, env, extra)),
  );

  server.registerTool(
    "emulator_stop",
    {
      title: "Stop Emulator",
      description: "Stop a running Android emulator",
      inputSchema: {
        deviceId: z
          .string()
          .describe("Device serial ID (e.g. 'emulator-5554'). Use device_list to find it"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => stopEmulator(args, env, extra)),
  );

  server.registerTool(
    "apk_install",
    {
      title: "Install APK",
      description: "Install an APK file on a connected Android device or emulator",
      inputSchema: {
        apkPath: z.string().describe("Absolute path to the APK file"),
        deviceId: z
          .string()
          .optional()
          .describe("Target device serial. Omit if only one device is connected"),
        reinstall: z.boolean().default(false).describe("Reinstall the app, keeping its data"),
        grantPermissions: z
          .boolean()
          .default(true)
          .describe("Automatically grant all runtime permissions"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => installApk(args, env, extra)),
  );

  server.registerTool(
    "app_launch",
    {
      title: "Launch App",
      description: "Launch an Android application on a connected device by package name",
      inputSchema: {
        packageName: z.string().describe("Application package name, e.g. 'com.example.myapp'"),
        activityName: z
          .string()
          .optional()
          .describe(
            "Fully qualified activity name. If omitted, launches the default/main activity",
          ),
        deviceId: z
          .string()
          .optional()
          .describe("Target device serial. Omit if only one device is connected"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => launchApp(args, env, extra)),
  );

  server.registerTool(
    "app_stop",
    {
      title: "Stop App",
      description: "Force stop an application on a connected Android device",
      inputSchema: {
        packageName: z.string().describe("Application package name to stop"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => stopApp(args, env, extra)),
  );

  server.registerTool(
    "app_clear_data",
    {
      title: "Clear App Data",
      description:
        "Clear all data for an installed app (equivalent to clearing storage in settings)",
      inputSchema: {
        packageName: z.string().describe("Application package name"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => appClearData(args, env, server, extra)),
  );

  server.registerTool(
    "app_permission",
    {
      title: "Set App Permission",
      description: "Grant or revoke a runtime permission for an app",
      inputSchema: {
        packageName: z.string().describe("Application package name"),
        permission: z.string().describe("Full permission name, e.g. 'android.permission.CAMERA'"),
        action: z.enum(["grant", "revoke"]).describe("Whether to grant or revoke the permission"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => appPermission(args, env, extra)),
  );

  server.registerTool(
    "app_permissions_list",
    {
      title: "List App Permissions",
      description:
        "List all permissions for an installed app, showing which are granted and which are denied",
      inputSchema: {
        packageName: z.string().describe("Application package name"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      outputSchema: {
        permissions: z.array(
          z.object({
            name: z.string(),
            granted: z.boolean(),
          }),
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => listAppPermissions(args, env, extra)),
  );

  server.registerTool(
    "adb_wifi_connect",
    {
      title: "Connect ADB over WiFi",
      description:
        "Connect to a device over WiFi ADB. Switches to TCP/IP mode, detects IP, and connects wirelessly",
      inputSchema: {
        deviceId: z
          .string()
          .optional()
          .describe("USB device serial to switch to WiFi (must be connected via USB first)"),
        port: z.number().default(5555).describe("TCP port for WiFi ADB"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra) => wifiAdbConnect(args, env, extra)),
  );

  server.registerTool(
    "adb_wifi_disconnect",
    {
      title: "Disconnect ADB WiFi",
      description: "Disconnect a WiFi ADB connection",
      inputSchema: {
        address: z
          .string()
          .optional()
          .describe("Address to disconnect (e.g. '192.168.1.5:5555'). If omitted, disconnects all"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra) => wifiAdbDisconnect(args, env, extra)),
  );

  server.registerTool(
    "file_push",
    {
      title: "Push File",
      description: "Push a local file to a connected Android device",
      inputSchema: {
        localPath: z.string().describe("Absolute path to the local file"),
        remotePath: z
          .string()
          .describe("Destination path on the device, e.g. '/sdcard/Download/file.txt'"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => filePush(args, env, extra)),
  );

  server.registerTool(
    "file_pull",
    {
      title: "Pull File",
      description: "Pull a file from a connected Android device to the local machine",
      inputSchema: {
        remotePath: z.string().describe("Path on the device, e.g. '/sdcard/Download/file.txt'"),
        localPath: z.string().describe("Local destination path"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra) => filePull(args, env, extra)),
  );
}
