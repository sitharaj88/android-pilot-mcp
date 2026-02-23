import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { errorResponse, execResultResponse } from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";

interface GradleBuildArgs {
  projectDir: string;
  variant: string;
  module?: string;
  stacktrace: boolean;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function runGradleBuild(args: GradleBuildArgs, _env: Environment) {
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

  const result = await executeCommand(gradlew, gradleArgs, {
    cwd: args.projectDir,
    timeout: 300_000,
  });

  return execResultResponse(result, {
    successPrefix: "Build succeeded",
    failurePrefix: "Build failed",
  });
}
