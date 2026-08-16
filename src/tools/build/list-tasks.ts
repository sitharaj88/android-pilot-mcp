import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { errorResponse, structuredResponse } from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import type { ToolExtra } from "./extra.js";

interface ListTasksArgs {
  projectDir: string;
  module?: string;
}

export interface GradleTaskInfo {
  name: string;
  description?: string;
}

const TASK_LINE_RE = /^(\S+)\s+-\s+(.+)$/;
const VALID_TASK_NAME_RE = /^[A-Za-z0-9_:][A-Za-z0-9_:.-]*$/;

export function parseGradleTaskListing(output: string): GradleTaskInfo[] {
  const tasks: GradleTaskInfo[] = [];
  try {
    for (const rawLine of output.split("\n")) {
      const line = rawLine.trim();
      if (!line || /^-+$/.test(line)) continue;

      const match = TASK_LINE_RE.exec(line);
      if (!match) continue;

      const [, name, description] = match;
      if (!VALID_TASK_NAME_RE.test(name)) continue;

      tasks.push({ name, description });
    }
  } catch {
    return [];
  }
  return tasks;
}

export async function listGradleTasks(args: ListTasksArgs, _env: Environment, extra: ToolExtra) {
  validateAbsolutePath(args.projectDir, "Project directory");

  const gradlew = join(args.projectDir, "gradlew");
  if (!existsSync(gradlew)) {
    return errorResponse(
      `No Gradle wrapper found at: ${gradlew}\nEnsure this is an Android project root directory.`,
    );
  }

  const task = args.module ? `${args.module}:tasks` : "tasks";
  const result = await executeCommand(gradlew, [task, "--all"], {
    cwd: args.projectDir,
    timeout: 120_000,
    signal: extra.signal,
  });

  if (!result.success) {
    return errorResponse(`Failed to list tasks.\n\nSTDERR:\n${result.stderr}`);
  }

  const tasks = parseGradleTaskListing(result.stdout);
  return structuredResponse(result.stdout, { tasks });
}
