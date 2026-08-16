import { z } from "zod";

export const logcatReadInputSchema = {
  deviceId: z.string().optional().describe("Target device serial"),
  tag: z.string().optional().describe("Filter by log tag, e.g. 'MyApp'"),
  priority: z
    .enum(["V", "D", "I", "W", "E", "F"])
    .optional()
    .describe("Minimum log priority level (V=Verbose, D=Debug, I=Info, W=Warn, E=Error, F=Fatal)"),
  grep: z
    .string()
    .optional()
    .describe("Filter output lines containing this string (case-insensitive)"),
  lines: z.number().default(100).describe("Maximum number of recent log lines to return"),
  since: z
    .string()
    .optional()
    .describe("Only show logs since this time, e.g. '2024-01-01 12:00:00.000'"),
};

export const logcatClearInputSchema = {
  deviceId: z.string().optional().describe("Target device serial"),
};

export const deviceScreenshotInputSchema = {
  deviceId: z.string().optional().describe("Target device serial"),
  savePath: z
    .string()
    .optional()
    .describe("Local path to save the screenshot file. If omitted, returns base64 data only"),
};

export const deviceInfoInputSchema = {
  deviceId: z.string().optional().describe("Target device serial"),
};

export const deviceInfoOutputSchema = {
  model: z.string().nullable().describe("Device model name"),
  manufacturer: z.string().nullable().describe("Device manufacturer"),
  androidVersion: z.string().nullable().describe("Android OS version"),
  sdkLevel: z.number().nullable().describe("Android API level"),
  cpuAbi: z.string().nullable().describe("Primary CPU ABI"),
  screenDensity: z.string().nullable().describe("Screen density (dpi)"),
  buildId: z.string().nullable().describe("Build display ID"),
  buildType: z.string().nullable().describe("Build type, e.g. 'user' or 'userdebug'"),
  hardware: z.string().nullable().describe("Hardware name"),
  heapSize: z.string().nullable().describe("Dalvik VM heap size"),
  batteryLevel: z.number().nullable().describe("Battery level percentage"),
  screenResolution: z.string().nullable().describe("Physical screen resolution"),
};

export const deviceShellInputSchema = {
  command: z.string().describe("Shell command to execute on the device"),
  deviceId: z.string().optional().describe("Target device serial"),
};

export const uiDumpInputSchema = {
  deviceId: z.string().optional().describe("Target device serial"),
  compressed: z.boolean().default(true).describe("Use compressed format for smaller output"),
};

export const screenRecordInputSchema = {
  deviceId: z.string().optional().describe("Target device serial"),
  duration: z
    .number()
    .min(1)
    .max(180)
    .default(10)
    .describe("Recording duration in seconds (1-180)"),
  savePath: z.string().describe("Local path to save the MP4 recording"),
};
