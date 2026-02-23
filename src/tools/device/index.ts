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
  server.tool(
    "device_list",
    "List all connected Android devices and running emulators with their status",
    {},
    withErrorHandling(async () => listDevices(env)),
  );

  server.tool(
    "avd_list",
    "List all available Android Virtual Devices (AVDs)",
    {},
    withErrorHandling(async () => listAvds(env)),
  );

  server.tool(
    "avd_create",
    "Create a new Android Virtual Device (AVD) with specified configuration",
    {
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
    withErrorHandling(async (args) => createAvd(args, env)),
  );

  server.tool(
    "emulator_start",
    "Start an Android emulator by AVD name. Returns once the device has booted or after timeout",
    {
      avdName: z.string().describe("Name of the AVD to start"),
      coldBoot: z.boolean().default(false).describe("Force a cold boot instead of using snapshot"),
      noWindow: z.boolean().default(false).describe("Run emulator without a GUI window (headless)"),
      wipeData: z.boolean().default(false).describe("Reset emulator to factory state"),
    },
    withErrorHandling(async (args) => startEmulator(args, env)),
  );

  server.tool(
    "emulator_stop",
    "Stop a running Android emulator",
    {
      deviceId: z
        .string()
        .describe("Device serial ID (e.g. 'emulator-5554'). Use device_list to find it"),
    },
    withErrorHandling(async (args) => stopEmulator(args, env)),
  );

  server.tool(
    "apk_install",
    "Install an APK file on a connected Android device or emulator",
    {
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
    withErrorHandling(async (args) => installApk(args, env)),
  );

  server.tool(
    "app_launch",
    "Launch an Android application on a connected device by package name",
    {
      packageName: z.string().describe("Application package name, e.g. 'com.example.myapp'"),
      activityName: z
        .string()
        .optional()
        .describe("Fully qualified activity name. If omitted, launches the default/main activity"),
      deviceId: z
        .string()
        .optional()
        .describe("Target device serial. Omit if only one device is connected"),
    },
    withErrorHandling(async (args) => launchApp(args, env)),
  );

  server.tool(
    "app_stop",
    "Force stop an application on a connected Android device",
    {
      packageName: z.string().describe("Application package name to stop"),
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => stopApp(args, env)),
  );

  server.tool(
    "app_clear_data",
    "Clear all data for an installed app (equivalent to clearing storage in settings)",
    {
      packageName: z.string().describe("Application package name"),
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => appClearData(args, env)),
  );

  server.tool(
    "app_permission",
    "Grant or revoke a runtime permission for an app",
    {
      packageName: z.string().describe("Application package name"),
      permission: z.string().describe("Full permission name, e.g. 'android.permission.CAMERA'"),
      action: z.enum(["grant", "revoke"]).describe("Whether to grant or revoke the permission"),
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => appPermission(args, env)),
  );

  server.tool(
    "app_permissions_list",
    "List all permissions for an installed app, showing which are granted and which are denied",
    {
      packageName: z.string().describe("Application package name"),
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => listAppPermissions(args, env)),
  );

  server.tool(
    "adb_wifi_connect",
    "Connect to a device over WiFi ADB. Switches to TCP/IP mode, detects IP, and connects wirelessly",
    {
      deviceId: z
        .string()
        .optional()
        .describe("USB device serial to switch to WiFi (must be connected via USB first)"),
      port: z.number().default(5555).describe("TCP port for WiFi ADB"),
    },
    withErrorHandling(async (args) => wifiAdbConnect(args, env)),
  );

  server.tool(
    "adb_wifi_disconnect",
    "Disconnect a WiFi ADB connection",
    {
      address: z
        .string()
        .optional()
        .describe("Address to disconnect (e.g. '192.168.1.5:5555'). If omitted, disconnects all"),
    },
    withErrorHandling(async (args) => wifiAdbDisconnect(args, env)),
  );

  server.tool(
    "file_push",
    "Push a local file to a connected Android device",
    {
      localPath: z.string().describe("Absolute path to the local file"),
      remotePath: z
        .string()
        .describe("Destination path on the device, e.g. '/sdcard/Download/file.txt'"),
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => filePush(args, env)),
  );

  server.tool(
    "file_pull",
    "Pull a file from a connected Android device to the local machine",
    {
      remotePath: z.string().describe("Path on the device, e.g. '/sdcard/Download/file.txt'"),
      localPath: z.string().describe("Local destination path"),
      deviceId: z.string().optional().describe("Target device serial"),
    },
    withErrorHandling(async (args) => filePull(args, env)),
  );
}
