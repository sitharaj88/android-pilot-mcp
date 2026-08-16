import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

type McpLogLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MCP_LEVEL: Record<LogLevel, McpLogLevel> = {
  debug: "debug",
  info: "info",
  warn: "warning",
  error: "error",
};

const PREFIX = "[android-pilot]";

let currentLevel: LogLevel = parseLevel(process.env.LOG_LEVEL);
let mcpServer: McpServer | undefined;

function parseLevel(value: string | undefined): LogLevel {
  if (value && value in LEVEL_ORDER) return value as LogLevel;
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `${timestamp} ${PREFIX} [${level.toUpperCase()}] ${message}`;
  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

function emitMcpLog(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!mcpServer) return;
  try {
    const payload = data && Object.keys(data).length > 0 ? { message, ...data } : { message };
    void mcpServer.server
      .sendLoggingMessage({ level: MCP_LEVEL[level], data: payload })
      .catch(() => {});
  } catch {
    // Never let logging errors propagate.
  }
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  process.stderr.write(formatMessage(level, message, data) + "\n");
  emitMcpLog(level, message, data);
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>): void {
    log("debug", message, data);
  },

  info(message: string, data?: Record<string, unknown>): void {
    log("info", message, data);
  },

  warn(message: string, data?: Record<string, unknown>): void {
    log("warn", message, data);
  },

  error(message: string, data?: Record<string, unknown>): void {
    log("error", message, data);
  },

  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  getLevel(): LogLevel {
    return currentLevel;
  },

  setMcpServer(server: McpServer | undefined): void {
    mcpServer = server;
  },
} as const;

export function setMcpServer(server: McpServer | undefined): void {
  logger.setMcpServer(server);
}
