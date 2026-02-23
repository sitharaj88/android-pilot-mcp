import { ValidationError } from "./validation.js";
import { logger } from "./logger.js";
import type { ExecResult } from "../types.js";

export interface ToolResponse {
  [key: string]: unknown;
  content: Array<
    { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
  >;
  isError?: boolean;
}

export const OUTPUT_LIMITS = {
  shellOutput: 10 * 1024,
  xmlDump: 50 * 1024,
  buildOutput: 100 * 1024,
  general: 50 * 1024,
} as const;

export function textResponse(text: string): ToolResponse {
  return {
    content: [{ type: "text" as const, text }],
  };
}

export function errorResponse(text: string): ToolResponse {
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
  };
}

export function imageResponse(
  base64Data: string,
  mimeType: string = "image/png",
  additionalText?: string,
): ToolResponse {
  const content: ToolResponse["content"] = [{ type: "image" as const, data: base64Data, mimeType }];
  if (additionalText) {
    content.push({ type: "text" as const, text: additionalText });
  }
  return { content };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

export function truncateOutput(
  text: string,
  maxBytes: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxBytes) return { text, truncated: false };
  return {
    text: text.slice(0, maxBytes),
    truncated: true,
  };
}

export function execResultResponse(
  result: ExecResult,
  opts: {
    successPrefix?: string;
    failurePrefix?: string;
    includeStderrOnSuccess?: boolean;
    maxOutputBytes?: number;
  } = {},
): ToolResponse {
  const {
    successPrefix = "Command completed",
    failurePrefix = "Command failed",
    includeStderrOnSuccess = false,
    maxOutputBytes,
  } = opts;

  if (result.success) {
    let output = result.stdout;
    let truncated = false;
    if (maxOutputBytes && output.length > maxOutputBytes) {
      output = output.slice(0, maxOutputBytes);
      truncated = true;
    }
    const parts = [
      `${successPrefix}.`,
      output ? `\n\n${output}` : "",
      truncated ? `\n\n[Output truncated at ${formatBytes(maxOutputBytes!)}]` : "",
      includeStderrOnSuccess && result.stderr ? `\n\nSTDERR:\n${result.stderr}` : "",
    ];
    return textResponse(parts.filter(Boolean).join(""));
  }

  const timedOutLabel = result.timedOut ? " [TIMED OUT]" : "";
  const exitLabel = result.exitCode !== null ? ` (exit code: ${result.exitCode})` : "";
  const parts = [
    `${failurePrefix}${exitLabel}${timedOutLabel}.`,
    result.stdout ? `\n\nSTDOUT:\n${result.stdout}` : "",
    result.stderr ? `\n\nSTDERR:\n${result.stderr}` : "",
  ];
  return errorResponse(parts.filter(Boolean).join(""));
}

export function withErrorHandling<T extends Record<string, unknown>>(
  handler: (args: T, ...rest: unknown[]) => Promise<ToolResponse>,
): (args: T, ...rest: unknown[]) => Promise<ToolResponse> {
  return async (args: T, ...rest: unknown[]): Promise<ToolResponse> => {
    try {
      return await handler(args, ...rest);
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        return errorResponse(err.message);
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Unhandled tool error", { error: message });
      return errorResponse(`Internal error: ${message}`);
    }
  };
}
