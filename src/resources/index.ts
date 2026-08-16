import { randomUUID } from "node:crypto";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeCommand } from "../executor.js";
import { Environment } from "../types.js";
import { validateDeviceId } from "../utils/validation.js";
import { truncateOutput, OUTPUT_LIMITS } from "../utils/response.js";

// Matches real "adb devices" rows (SERIAL <whitespace> STATE ...), which excludes the
// "List of devices attached" header and any daemon-startup noise lines (e.g. "* daemon
// started successfully") that adb may print before the device list.
const DEVICE_LINE_RE =
  /^\S+\s+(device|offline|unauthorized|bootloader|recovery|sideload|host|no permissions|connecting|authorizing)\b/;

function parseDevices(
  stdout: string,
): Array<{ serial: string; state: string } & Record<string, string>> {
  const lines = stdout.split("\n");
  return lines
    .filter((line) => DEVICE_LINE_RE.test(line.trim()))
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const serial = parts[0];
      const state = parts[1];
      const props: Record<string, string> = {};
      for (const part of parts.slice(2)) {
        const [key, value] = part.split(":");
        if (key && value) props[key] = value;
      }
      return { serial, state, ...props };
    });
}

function parseAvdNames(stdout: string): string[] {
  const names: string[] = [];
  const re = /^\s*Name:\s*(.+)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stdout)) !== null) {
    names.push(match[1].trim());
  }
  return names;
}

function firstValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function registerResources(server: McpServer, env: Environment): void {
  server.registerResource(
    "devices",
    "android://devices",
    {
      title: "Connected Devices",
      description: "Currently connected Android devices and emulators (adb devices -l)",
      mimeType: "application/json",
    },
    async (uri) => {
      const result = await executeCommand(env.adbPath, ["devices", "-l"], { timeout: 10_000 });
      const body = result.success
        ? { devices: parseDevices(result.stdout) }
        : { devices: [], error: result.stderr };
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(body, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "avds",
    "android://avds",
    {
      title: "Available AVDs",
      description: "Android Virtual Device names available on this machine",
      mimeType: "application/json",
    },
    async (uri) => {
      const result = await executeCommand(env.avdmanagerPath, ["list", "avd"], {
        timeout: 15_000,
      });
      const body = result.success
        ? { avds: parseAvdNames(result.stdout) }
        : { avds: [], error: result.stderr };
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(body, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "logcat",
    new ResourceTemplate("android://logcat/{deviceId}", { list: undefined }),
    {
      title: "Device Logcat",
      description: "Recent logcat output (last 200 lines) for a specific device",
      mimeType: "text/plain",
    },
    async (uri, variables) => {
      const deviceId = validateDeviceId(firstValue(variables.deviceId));
      const result = await executeCommand(
        env.adbPath,
        ["-s", deviceId, "logcat", "-d", "-t", "200"],
        { timeout: 15_000 },
      );
      const { text } = truncateOutput(
        result.success ? result.stdout : `Failed to read logcat.\n\n${result.stderr}`,
        OUTPUT_LIMITS.buildOutput,
      );
      return {
        contents: [{ uri: uri.toString(), mimeType: "text/plain", text }],
      };
    },
  );

  server.registerResource(
    "uidump",
    new ResourceTemplate("android://uidump/{deviceId}", { list: undefined }),
    {
      title: "UI Hierarchy Dump",
      description: "uiautomator XML dump of the current UI hierarchy for a specific device",
      mimeType: "text/xml",
    },
    async (uri, variables) => {
      const deviceId = validateDeviceId(firstValue(variables.deviceId));
      const baseArgs = ["-s", deviceId];
      const dumpPath = `/sdcard/mcp_uidump_${randomUUID()}.xml`;

      const dumpResult = await executeCommand(
        env.adbPath,
        [...baseArgs, "shell", "uiautomator", "dump", dumpPath],
        { timeout: 15_000 },
      );
      if (!dumpResult.success) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "text/xml",
              text: `<!-- Failed to dump UI hierarchy: ${dumpResult.stderr} -->`,
            },
          ],
        };
      }

      const catResult = await executeCommand(env.adbPath, [...baseArgs, "shell", "cat", dumpPath], {
        timeout: 10_000,
      });
      await executeCommand(env.adbPath, [...baseArgs, "shell", "rm", "-f", dumpPath], {
        timeout: 5_000,
      });

      const { text } = truncateOutput(
        catResult.success
          ? catResult.stdout
          : `<!-- UI dump created but failed to read: ${catResult.stderr} -->`,
        OUTPUT_LIMITS.xmlDump,
      );
      return {
        contents: [{ uri: uri.toString(), mimeType: "text/xml", text }],
      };
    },
  );
}
