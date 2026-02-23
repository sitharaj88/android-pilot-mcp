import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { executeCommand } from "../../executor.js";
import { Environment } from "../../types.js";
import { textResponse, errorResponse } from "../../utils/response.js";
import { validateAbsolutePath } from "../../utils/validation.js";

interface LintRunArgs {
  projectDir: string;
  module: string;
  fatal: boolean;
}

export async function lintRun(args: LintRunArgs, _env: Environment) {
  validateAbsolutePath(args.projectDir, "Project directory");

  const gradlew = join(args.projectDir, "gradlew");
  if (!existsSync(gradlew)) {
    return errorResponse(
      `No Gradle wrapper found at: ${gradlew}\nEnsure this is an Android project root directory.`,
    );
  }

  const task = `${args.module}:lint`;
  const result = await executeCommand(gradlew, [task], {
    cwd: args.projectDir,
    timeout: 300_000,
  });

  // Try to read the lint results XML/HTML
  const reportPaths = [
    join(args.projectDir, args.module.replace(":", ""), "build", "reports", "lint-results.txt"),
    join(args.projectDir, args.module.replace(":", ""), "build", "reports", "lint-results-debug.txt"),
  ];

  let reportContent = "";
  for (const reportPath of reportPaths) {
    if (existsSync(reportPath)) {
      try {
        reportContent = readFileSync(reportPath, "utf-8");
        break;
      } catch {
        // ignore read errors
      }
    }
  }

  const output = [
    result.success ? "Lint completed." : `Lint finished with issues (exit code: ${result.exitCode}).`,
    "",
    result.stdout,
  ];

  if (reportContent) {
    output.push("\n--- Lint Report ---\n", reportContent);
  }

  if (result.stderr && !result.success) {
    output.push("\nSTDERR:\n", result.stderr);
  }

  // Determine if there are fatal issues
  const hasFatalIssues =
    !result.success &&
    (result.stdout.includes("Error:") || result.stderr.includes("Error:"));

  const text = output.join("\n");
  if (args.fatal && hasFatalIssues) {
    return errorResponse(text);
  }
  return textResponse(text);
}
