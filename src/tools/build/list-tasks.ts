import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";

interface ListTasksArgs {
  projectDir: string;
  module?: string;
}

export async function listGradleTasks(args: ListTasksArgs, _env: Environment) {
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
  });

  if (result.success) {
    return textResponse(result.stdout);
  }
  return errorResponse(`Failed to list tasks.\n\nSTDERR:\n${result.stderr}`);
}
