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

interface ScaffoldFragmentArgs {
  projectDir: string;
  fragmentName: string;
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

export async function scaffoldFragment(args: ScaffoldFragmentArgs, _env: Environment) {
  validateAbsolutePath(args.projectDir, "Project directory");
  validatePackageName(args.packageName);
  validateSafeName(args.fragmentName, "Fragment name");

  const packagePath = args.packageName.replace(/\./g, "/");
  const javaDir = join(args.projectDir, args.module, "src", "main", "java", packagePath);
  const layoutDir = join(args.projectDir, args.module, "src", "main", "res", "layout");
  const layoutName = `fragment_${toSnakeCase(args.fragmentName.replace(/Fragment$/, ""))}`;

  try {
    mkdirSync(javaDir, { recursive: true });

    const template = readFileSync(join(TEMPLATES_DIR, "fragment.kt.tmpl"), "utf-8");
    const content = template
      .replaceAll("{{PACKAGE_NAME}}", args.packageName)
      .replaceAll("{{FRAGMENT_NAME}}", args.fragmentName)
      .replaceAll("{{LAYOUT_NAME}}", layoutName);

    const fragmentPath = join(javaDir, `${args.fragmentName}.kt`);
    if (existsSync(fragmentPath)) {
      return errorResponse(`File already exists: ${fragmentPath}`);
    }

    writeFileSync(fragmentPath, content);
    const created = [`${args.module}/src/main/java/${packagePath}/${args.fragmentName}.kt`];

    if (args.layout) {
      mkdirSync(layoutDir, { recursive: true });
      const layoutTemplate = readFileSync(join(TEMPLATES_DIR, "fragment_layout.xml.tmpl"), "utf-8");
      const layoutContent = layoutTemplate
        .replaceAll("{{PACKAGE_NAME}}", args.packageName)
        .replaceAll("{{FRAGMENT_NAME}}", args.fragmentName);

      writeFileSync(join(layoutDir, `${layoutName}.xml`), layoutContent);
      created.push(`${args.module}/src/main/res/layout/${layoutName}.xml`);
    }

    return textResponse(
      `Fragment "${args.fragmentName}" created.\n\nFiles:\n${created.map((f) => `  - ${f}`).join("\n")}`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to create fragment: ${message}`);
  }
}
