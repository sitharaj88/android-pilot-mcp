import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Environment } from "../../types.js";
import { withErrorHandling } from "../../utils/response.js";
import { createProject } from "./create-project.js";
import { scaffoldActivity } from "./create-activity.js";
import { scaffoldFragment } from "./create-fragment.js";
import { scaffoldComposeScreen } from "./create-compose-screen.js";

export function registerScaffoldTools(server: McpServer, env: Environment): void {
  server.tool(
    "project_create",
    "Create a new Android project with Kotlin and Gradle KTS, optionally with Jetpack Compose",
    {
      projectName: z.string().describe("Project name (will also be the directory name)"),
      packageName: z.string().describe("Java/Kotlin package name, e.g. 'com.example.myapp'"),
      parentDir: z.string().describe("Parent directory where the project folder will be created"),
      minSdk: z.number().default(24).describe("Minimum Android SDK version"),
      targetSdk: z.number().default(35).describe("Target Android SDK version"),
      useCompose: z.boolean().default(true).describe("Use Jetpack Compose instead of XML layouts"),
      agpVersion: z.string().default("8.7.3").describe("Android Gradle Plugin version"),
      kotlinVersion: z.string().default("2.1.0").describe("Kotlin version"),
    },
    withErrorHandling(async (args) => createProject(args, env)),
  );

  server.tool(
    "scaffold_activity",
    "Generate a new Activity Kotlin file from a template and add it to an existing Android project",
    {
      projectDir: z.string().describe("Absolute path to the Android project root"),
      activityName: z.string().describe("Activity class name, e.g. 'DetailActivity'"),
      packageName: z.string().describe("Package name, e.g. 'com.example.myapp'"),
      layout: z.boolean().default(true).describe("Generate a corresponding XML layout file"),
      module: z.string().default("app").describe("Module name"),
    },
    withErrorHandling(async (args) => scaffoldActivity(args, env)),
  );

  server.tool(
    "scaffold_fragment",
    "Generate a new Fragment Kotlin file from a template",
    {
      projectDir: z.string().describe("Absolute path to the Android project root"),
      fragmentName: z.string().describe("Fragment class name, e.g. 'ProfileFragment'"),
      packageName: z.string().describe("Package name"),
      layout: z.boolean().default(true).describe("Generate a corresponding XML layout file"),
      module: z.string().default("app").describe("Module name"),
    },
    withErrorHandling(async (args) => scaffoldFragment(args, env)),
  );

  server.tool(
    "scaffold_compose_screen",
    "Generate a new Jetpack Compose screen file with a composable function and preview",
    {
      projectDir: z.string().describe("Absolute path to the Android project root"),
      screenName: z.string().describe("Screen name, e.g. 'Profile' (will create ProfileScreen.kt)"),
      packageName: z.string().describe("Package name"),
      module: z.string().default("app").describe("Module name"),
      includeViewModel: z
        .boolean()
        .default(false)
        .describe("Also generate a ViewModel file for this screen"),
    },
    withErrorHandling(async (args) => scaffoldComposeScreen(args, env)),
  );
}
