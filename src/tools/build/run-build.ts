import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import {
  errorResponse,
  OUTPUT_LIMITS,
  structuredResponse,
  truncateOutput,
} from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import type { ToolExtra } from "./extra.js";

interface GradleBuildArgs {
  projectDir: string;
  variant: string;
  module?: string;
  stacktrace: boolean;
}

const PROGRESS_INTERVAL_MS = 7_000;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function startProgressHeartbeat(extra: ToolExtra): NodeJS.Timeout | undefined {
  const progressToken = extra._meta?.progressToken;
  if (progressToken === undefined) return undefined;

  const startedAt = Date.now();
  return setInterval(() => {
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    void extra
      .sendNotification({
        method: "notifications/progress",
        params: {
          progressToken,
          progress: elapsedSeconds,
          message: `Build running for ${elapsedSeconds}s...`,
        },
      })
      .catch(() => {});
  }, PROGRESS_INTERVAL_MS);
}

export async function runGradleBuild(args: GradleBuildArgs, _env: Environment, extra: ToolExtra) {
  validateAbsolutePath(args.projectDir, "Project directory");

  const gradlew = join(args.projectDir, "gradlew");
  if (!existsSync(gradlew)) {
    return errorResponse(
      `No Gradle wrapper found at: ${gradlew}\nEnsure this is an Android project root directory.`,
    );
  }

  const task = args.module
    ? `${args.module}:assemble${capitalize(args.variant)}`
    : `assemble${capitalize(args.variant)}`;

  const gradleArgs = [task];
  if (args.stacktrace) gradleArgs.push("--stacktrace");

  const heartbeat = startProgressHeartbeat(extra);
  let result;
  try {
    result = await executeCommand(gradlew, gradleArgs, {
      cwd: args.projectDir,
      timeout: 300_000,
      signal: extra.signal,
    });
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }

  const { text: stdout, truncated } = truncateOutput(result.stdout, OUTPUT_LIMITS.buildOutput);

  if (!result.success) {
    const timedOutLabel = result.timedOut ? " [TIMED OUT]" : "";
    const exitLabel = result.exitCode !== null ? ` (exit code: ${result.exitCode})` : "";
    const parts = [
      `Build failed${exitLabel}${timedOutLabel}.`,
      stdout ? `\n\nSTDOUT:\n${stdout}` : "",
      result.stderr ? `\n\nSTDERR:\n${result.stderr}` : "",
      truncated ? "\n\n[Output truncated]" : "",
    ];
    return {
      content: [{ type: "text" as const, text: parts.filter(Boolean).join("") }],
      isError: true,
      structuredContent: { success: false, exitCode: result.exitCode, truncated },
    };
  }

  const parts = [
    "Build succeeded.",
    stdout ? `\n\n${stdout}` : "",
    truncated ? "\n\n[Output truncated]" : "",
  ];
  return structuredResponse(parts.filter(Boolean).join(""), {
    success: true,
    exitCode: result.exitCode,
    truncated,
  });
}
