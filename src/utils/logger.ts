export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const PREFIX = "[android-pilot]";

let currentLevel: LogLevel = parseLevel(process.env.LOG_LEVEL);

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

export const logger = {
  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("debug")) {
      process.stderr.write(formatMessage("debug", message, data) + "\n");
    }
  },

  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("info")) {
      process.stderr.write(formatMessage("info", message, data) + "\n");
    }
  },

  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("warn")) {
      process.stderr.write(formatMessage("warn", message, data) + "\n");
    }
  },

  error(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("error")) {
      process.stderr.write(formatMessage("error", message, data) + "\n");
    }
  },

  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  getLevel(): LogLevel {
    return currentLevel;
  },
} as const;
