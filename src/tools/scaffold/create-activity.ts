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

interface ScaffoldActivityArgs {
  projectDir: string;
  activityName: string;
  packageName: string;
  layout: boolean;
  module: string;
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

export async function scaffoldActivity(args: ScaffoldActivityArgs, _env: Environment) {
  validateAbsolutePath(args.projectDir, "Project directory");
  validatePackageName(args.packageName);
  validateSafeName(args.activityName, "Activity name");

  const packagePath = args.packageName.replace(/\./g, "/");
  const javaDir = join(args.projectDir, args.module, "src", "main", "java", packagePath);
  const layoutDir = join(args.projectDir, args.module, "src", "main", "res", "layout");
  const layoutName = `activity_${toSnakeCase(args.activityName.replace(/Activity$/, ""))}`;

  try {
    // Create directories
    mkdirSync(javaDir, { recursive: true });

    // Read and process template
    const template = readFileSync(join(TEMPLATES_DIR, "activity.kt.tmpl"), "utf-8");
    const content = template
      .replaceAll("{{PACKAGE_NAME}}", args.packageName)
      .replaceAll("{{ACTIVITY_NAME}}", args.activityName)
      .replaceAll("{{LAYOUT_NAME}}", layoutName);

    const activityPath = join(javaDir, `${args.activityName}.kt`);
    if (existsSync(activityPath)) {
      return errorResponse(`File already exists: ${activityPath}`);
    }

    writeFileSync(activityPath, content);
    const created = [`${args.module}/src/main/java/${packagePath}/${args.activityName}.kt`];

    // Create layout
    if (args.layout) {
      mkdirSync(layoutDir, { recursive: true });
      const layoutTemplate = readFileSync(join(TEMPLATES_DIR, "activity_layout.xml.tmpl"), "utf-8");
      const layoutContent = layoutTemplate
        .replaceAll("{{PACKAGE_NAME}}", args.packageName)
        .replaceAll("{{ACTIVITY_NAME}}", args.activityName);

      writeFileSync(join(layoutDir, `${layoutName}.xml`), layoutContent);
      created.push(`${args.module}/src/main/res/layout/${layoutName}.xml`);
    }

    return textResponse(
      `Activity "${args.activityName}" created.\n\nFiles:\n${created.map((f) => `  - ${f}`).join("\n")}\n\nRemember to register the activity in AndroidManifest.xml.`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to create activity: ${message}`);
  }
}
