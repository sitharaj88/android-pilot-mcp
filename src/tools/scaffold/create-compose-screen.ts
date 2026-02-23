import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Environment } from "../../types.js";
import {
  validateAbsolutePath,
  validatePackageName,
  validateSafeName,
} from "../../utils/validation.js";
import { textResponse, errorResponse } from "../../utils/response.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "..", "templates");

interface ScaffoldComposeScreenArgs {
  projectDir: string;
  screenName: string;
  packageName: string;
  module: string;
  includeViewModel: boolean;
}

export async function scaffoldComposeScreen(args: ScaffoldComposeScreenArgs, _env: Environment) {
  validateAbsolutePath(args.projectDir, "Project directory");
  validatePackageName(args.packageName);
  validateSafeName(args.screenName, "Screen name");

  const packagePath = args.packageName.replace(/\./g, "/");
  const javaDir = join(args.projectDir, args.module, "src", "main", "java", packagePath);

  try {
    mkdirSync(javaDir, { recursive: true });

    // Create screen composable
    const screenTemplate = readFileSync(join(TEMPLATES_DIR, "compose-screen.kt.tmpl"), "utf-8");
    const screenContent = screenTemplate
      .replaceAll("{{PACKAGE_NAME}}", args.packageName)
      .replaceAll("{{SCREEN_NAME}}", args.screenName);

    const screenPath = join(javaDir, `${args.screenName}Screen.kt`);
    if (existsSync(screenPath)) {
      return errorResponse(`File already exists: ${screenPath}`);
    }

    writeFileSync(screenPath, screenContent);
    const created = [`${args.module}/src/main/java/${packagePath}/${args.screenName}Screen.kt`];

    // Create ViewModel if requested
    if (args.includeViewModel) {
      const vmTemplate = readFileSync(join(TEMPLATES_DIR, "viewmodel.kt.tmpl"), "utf-8");
      const vmContent = vmTemplate
        .replaceAll("{{PACKAGE_NAME}}", args.packageName)
        .replaceAll("{{SCREEN_NAME}}", args.screenName);

      const vmPath = join(javaDir, `${args.screenName}ViewModel.kt`);
      writeFileSync(vmPath, vmContent);
      created.push(`${args.module}/src/main/java/${packagePath}/${args.screenName}ViewModel.kt`);
    }

    return textResponse(
      `Compose screen "${args.screenName}" created.\n\nFiles:\n${created.map((f) => `  - ${f}`).join("\n")}`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to create compose screen: ${message}`);
  }
}
