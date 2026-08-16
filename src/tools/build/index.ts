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
import type { ToolExtra } from "./extra.js";

export function registerBuildTools(server: McpServer, env: Environment): void {
  server.registerTool(
    "gradle_build",
    {
      title: "Run Gradle Build",
      description:
        "Run a Gradle build for an Android project. Supports debug/release variants and optional module targeting",
      inputSchema: {
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
      outputSchema: {
        success: z.boolean(),
        exitCode: z.number().nullable(),
        truncated: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra: ToolExtra) => runGradleBuild(args, env, extra)),
  );

  server.registerTool(
    "gradle_task",
    {
      title: "Run Gradle Task",
      description: "Run an arbitrary Gradle task in an Android project",
      inputSchema: {
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
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra: ToolExtra) => runGradleTask(args, env, extra)),
  );

  server.registerTool(
    "gradle_list_tasks",
    {
      title: "List Gradle Tasks",
      description: "List all available Gradle tasks in an Android project",
      inputSchema: {
        projectDir: z
          .string()
          .describe("Absolute path to the Android project root directory"),
        module: z
          .string()
          .optional()
          .describe("Specific module to list tasks for"),
      },
      outputSchema: {
        tasks: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
          }),
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra: ToolExtra) => listGradleTasks(args, env, extra)),
  );

  server.registerTool(
    "gradle_clean",
    {
      title: "Clean Gradle Build",
      description: "Clean the build output of an Android project",
      inputSchema: {
        projectDir: z
          .string()
          .describe("Absolute path to the Android project root directory"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async (args, extra: ToolExtra) => cleanProject(args, env, extra)),
  );

  server.registerTool(
    "gradle_dependencies",
    {
      title: "Show Gradle Dependencies",
      description: "Show the dependency tree for an Android project module",
      inputSchema: {
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
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra: ToolExtra) => showDependencies(args, env, extra)),
  );

  server.registerTool(
    "lint_run",
    {
      title: "Run Android Lint",
      description:
        "Run Android Lint analysis on a project and return warnings, errors, and suggestions with file locations",
      inputSchema: {
        projectDir: z
          .string()
          .describe("Absolute path to the Android project root directory"),
        module: z.string().default(":app").describe("Module to lint"),
        fatal: z
          .boolean()
          .default(false)
          .describe("If true, report as error when fatal lint issues are found"),
      },
      outputSchema: {
        success: z.boolean(),
        exitCode: z.number().nullable(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args, extra: ToolExtra) => lintRun(args, env, extra)),
  );
}
