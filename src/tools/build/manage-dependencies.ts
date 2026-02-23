import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";

interface DependenciesArgs {
  projectDir: string;
  module: string;
  configuration?: string;
}

export async function showDependencies(args: DependenciesArgs, _env: Environment) {
  validateAbsolutePath(args.projectDir, "Project directory");

  const gradlew = join(args.projectDir, "gradlew");
  if (!existsSync(gradlew)) {
    return errorResponse(
      `No Gradle wrapper found at: ${gradlew}\nEnsure this is an Android project root directory.`,
    );
  }

  const gradleArgs = [`${args.module}:dependencies`];
  if (args.configuration) {
    gradleArgs.push("--configuration", args.configuration);
  }

  const result = await executeCommand(gradlew, gradleArgs, {
    cwd: args.projectDir,
    timeout: 120_000,
  });

  if (result.success) {
    return textResponse(result.stdout);
  }
  return errorResponse(`Failed to get dependencies.\n\nSTDERR:\n${result.stderr}`);
}
