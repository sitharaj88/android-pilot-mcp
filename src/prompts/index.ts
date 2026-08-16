import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

function userMessage(text: string): GetPromptResult {
  return {
    messages: [{ role: "user", content: { type: "text", text } }],
  };
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "debug-crash",
    {
      title: "Debug a crash",
      description: "Reproduce, capture, and diagnose a crash for an installed app",
      argsSchema: {
        packageName: z.string().describe("Package name of the crashing app"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
    },
    ({ packageName, deviceId }) =>
      userMessage(
        `Debug a crash in ${packageName}${deviceId ? ` on device ${deviceId}` : ""}.\n\n` +
          `1. Use device_list to confirm the target device${deviceId ? ` (${deviceId})` : ""} is connected.\n` +
          `2. Use logcat_clear to clear old logs, then app_launch to (re)start ${packageName} and reproduce the crash.\n` +
          `3. Use logcat_read with tag/grep filtering on "${packageName}" and priority "E" to capture the stack trace.\n` +
          `4. Identify the exception type, message, and topmost app-owned frame (ignore framework frames). If the trace ` +
          `references native code, note the offset for manual symbolication — this server has no symbolicate tool.\n` +
          `5. Propose a concrete code fix referencing the failing file/line, and state how to verify it (rebuild with ` +
          `gradle_build, reinstall with apk_install, repeat steps 2-3).`,
      ),
  );

  server.registerPrompt(
    "setup-emulator",
    {
      title: "Set up an emulator",
      description: "Install a system image and create/start an AVD",
      argsSchema: {
        apiLevel: z.string().optional().describe("Android API level, e.g. '35'"),
        deviceProfile: z.string().optional().describe("Hardware profile, e.g. 'pixel_6'"),
      },
    },
    ({ apiLevel, deviceProfile }) => {
      const api = apiLevel ?? "35";
      const profile = deviceProfile ?? "pixel_6";
      const image = `system-images;android-${api};google_apis;arm64-v8a`;
      return userMessage(
        `Set up an emulator for API ${api} using the "${profile}" profile.\n\n` +
          `1. Use sdk_list (installed=true) to check whether "${image}" is already installed.\n` +
          `2. If missing, use sdk_install with packages: ["${image}"].\n` +
          `3. Use avd_create with name (e.g. "api${api}_${profile}"), package: "${image}", device: "${profile}".\n` +
          `4. Use emulator_start with the new avdName. Prefer noWindow: true for headless/CI use.\n` +
          `5. Confirm boot with device_list once emulator_start returns.`,
      );
    },
  );

  server.registerPrompt(
    "install-and-test-apk",
    {
      title: "Install and test an APK",
      description: "Analyze, install, launch, and check logs for an APK",
      argsSchema: {
        apkPath: z.string().describe("Absolute path to the APK file"),
        packageName: z.string().optional().describe("Package name, if known"),
      },
    },
    ({ apkPath, packageName }) =>
      userMessage(
        `Install and test the APK at ${apkPath}${packageName ? ` (package ${packageName})` : ""}.\n\n` +
          `1. Use apk_analyze on "${apkPath}" (detail: "summary") to confirm size, package name, min/target SDK.\n` +
          `2. Use device_list to pick a target device if more than one is connected.\n` +
          `3. Use apk_install with apkPath: "${apkPath}", reinstall: true, grantPermissions: true.\n` +
          `4. Use app_launch with the package name from step 1${packageName ? ` (${packageName})` : ""}.\n` +
          `5. Use logcat_read filtered by that package name (grep or tag) to confirm a clean launch with no crashes.`,
      ),
  );

  server.registerPrompt(
    "ui-inspect",
    {
      title: "Inspect the UI",
      description: "Capture the UI hierarchy and a screenshot to locate elements",
      argsSchema: {
        deviceId: z.string().optional().describe("Target device serial"),
      },
    },
    ({ deviceId }) =>
      userMessage(
        `Inspect the current UI${deviceId ? ` on device ${deviceId}` : ""}.\n\n` +
          `1. Use ui_dump${deviceId ? ` with deviceId: "${deviceId}"` : ""} to get the XML view hierarchy — read ` +
          `resource-id, text, content-desc, class, and bounds for each node you care about.\n` +
          `2. Use device_screenshot${deviceId ? ` with deviceId: "${deviceId}"` : ""} to visually confirm what the ` +
          `dump describes.\n` +
          `3. Cross-reference bounds from the dump with the screenshot to pinpoint the element you need to interact ` +
          `with, and report its resource-id or bounds (center x,y) for automation.`,
      ),
  );

  server.registerPrompt(
    "performance-check",
    {
      title: "Performance check",
      description: "Build release, inspect APK size, and watch runtime logs for perf issues",
      argsSchema: {
        packageName: z.string().describe("Application package name"),
        deviceId: z.string().optional().describe("Target device serial"),
      },
    },
    ({ packageName, deviceId }) =>
      userMessage(
        `Run a performance check for ${packageName}${deviceId ? ` on device ${deviceId}` : ""}.\n\n` +
          `1. Determine the project's root directory, then use gradle_build with variant: "release" to produce an ` +
          `optimized build (note total build time and any warnings).\n` +
          `2. Use apk_analyze (detail: "summary") on the resulting release APK to check size, DEX method count, and ` +
          `target SDK — flag anything unusually large.\n` +
          `3. Use apk_install then app_launch for ${packageName}${deviceId ? ` (deviceId: "${deviceId}")` : ""}, and ` +
          `exercise the app's main flows.\n` +
          `4. Use logcat_read with grep "${packageName}" and priority "W" to catch ANR warnings, GC churn, strict-mode ` +
          `violations, or dropped frames while the app runs.\n` +
          `5. Summarize findings: APK size, startup behavior, and any warnings from step 4.`,
      ),
  );

  server.registerPrompt(
    "release-preflight",
    {
      title: "Release preflight checklist",
      description: "Clean build, lint, and analyze the APK before a release",
      argsSchema: {
        module: z.string().optional().describe("Module to target, e.g. ':app'"),
      },
    },
    ({ module }) =>
      userMessage(
        `Run a release preflight checklist${module ? ` for module ${module}` : ""}.\n\n` +
          `1. Determine the project's root directory, then use gradle_clean to remove stale build output.\n` +
          `2. Use gradle_build with variant: "release"${module ? `, module: "${module}"` : ""} and confirm it succeeds ` +
          `with no errors.\n` +
          `3. Use lint_run${module ? ` with module: "${module}"` : ""} and fatal: true; resolve any fatal issues before ` +
          `proceeding.\n` +
          `4. Use apk_analyze (detail: "full") on the release APK: confirm versionCode/versionName are bumped, size is ` +
          `reasonable, and target/min SDK are correct.\n` +
          `5. Report a go/no-go checklist covering build status, lint results, and APK metadata.`,
      ),
  );
}
