import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { errorResponse, execResultResponse } from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";

interface GradleTaskArgs {
  projectDir: string;
  task: string;
  args?: string[];
}

export async function runGradleTask(args: GradleTaskArgs, _env: Environment) {
  validateAbsolutePath(args.projectDir, "Project directory");

  const gradlew = join(args.projectDir, "gradlew");
  if (!existsSync(gradlew)) {
    return errorResponse(
      `No Gradle wrapper found at: ${gradlew}\nEnsure this is an Android project root directory.`,
    );
  }

  const gradleArgs = [args.task, ...(args.args ?? [])];

  const result = await executeCommand(gradlew, gradleArgs, {
    cwd: args.projectDir,
    timeout: 300_000,
  });

  return execResultResponse(result, {
    successPrefix: `Task '${args.task}' completed`,
    failurePrefix: `Task '${args.task}' failed`,
  });
}
