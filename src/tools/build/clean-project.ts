import { existsSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { errorResponse, execResultResponse } from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";

interface CleanProjectArgs {
  projectDir: string;
}

export async function cleanProject(args: CleanProjectArgs, _env: Environment) {
  validateAbsolutePath(args.projectDir, "Project directory");

  const gradlew = join(args.projectDir, "gradlew");
  if (!existsSync(gradlew)) {
    return errorResponse(
      `No Gradle wrapper found at: ${gradlew}\nEnsure this is an Android project root directory.`,
    );
  }

  const result = await executeCommand(gradlew, ["clean"], {
    cwd: args.projectDir,
    timeout: 120_000,
  });

  return execResultResponse(result, {
    successPrefix: "Project cleaned successfully",
    failurePrefix: "Clean failed",
  });
}
