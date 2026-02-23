import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { runGradleBuild } from "./run-build.js";
import { runGradleTask } from "./run-task.js";
import { listGradleTasks } from "./list-tasks.js";
import { cleanProject } from "./clean-project.js";
import { showDependencies } from "./manage-dependencies.js";
import { lintRun } from "./lint-run.js";

export function registerBuildTools(server: McpServer, env: Environment): void {
  server.tool(
    "gradle_build",
    "Run a Gradle build for an Android project. Supports debug/release variants and optional module targeting",
    {
      projectDir: z
        .string()
        .describe("Absolute path to the Android project root directory"),
      variant: z
        .enum(["debug", "release"])
        .default("debug")
        .describe("Build variant"),
      module: z
        .string()
        .optional()
        .describe("Specific module to build, e.g. ':app'. Omit for root project"),
      stacktrace: z
        .boolean()
        .default(false)
        .describe("Include full stacktrace on error"),
    },
    withErrorHandling(async (args) => runGradleBuild(args, env)),
  );

  server.tool(
    "gradle_task",
    "Run an arbitrary Gradle task in an Android project",
    {
      projectDir: z
        .string()
        .describe("Absolute path to the Android project root directory"),
      task: z
        .string()
        .describe("Gradle task to run, e.g. 'test', 'lint', ':app:connectedAndroidTest'"),
      args: z
        .array(z.string())
        .optional()
        .describe("Additional Gradle arguments, e.g. ['--info', '-Pfoo=bar']"),
    },
    withErrorHandling(async (args) => runGradleTask(args, env)),
  );

  server.tool(
    "gradle_list_tasks",
    "List all available Gradle tasks in an Android project",
    {
      projectDir: z
        .string()
        .describe("Absolute path to the Android project root directory"),
      module: z
        .string()
        .optional()
        .describe("Specific module to list tasks for"),
    },
    withErrorHandling(async (args) => listGradleTasks(args, env)),
  );

  server.tool(
    "gradle_clean",
    "Clean the build output of an Android project",
    {
      projectDir: z
        .string()
        .describe("Absolute path to the Android project root directory"),
    },
    withErrorHandling(async (args) => cleanProject(args, env)),
  );

  server.tool(
    "gradle_dependencies",
    "Show the dependency tree for an Android project module",
    {
      projectDir: z
        .string()
        .describe("Absolute path to the Android project root directory"),
      module: z
        .string()
        .default(":app")
        .describe("Module to show dependencies for"),
      configuration: z
        .string()
        .optional()
        .describe("Configuration to show, e.g. 'debugCompileClasspath'"),
    },
    withErrorHandling(async (args) => showDependencies(args, env)),
  );

  server.tool(
    "lint_run",
    "Run Android Lint analysis on a project and return warnings, errors, and suggestions with file locations",
    {
      projectDir: z
        .string()
        .describe("Absolute path to the Android project root directory"),
      module: z
        .string()
        .default(":app")
        .describe("Module to lint"),
      fatal: z
        .boolean()
        .default(false)
        .describe("If true, report as error when fatal lint issues are found"),
    },
    withErrorHandling(async (args) => lintRun(args, env)),
  );
}
