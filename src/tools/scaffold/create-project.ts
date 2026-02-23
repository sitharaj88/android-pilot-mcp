import { mkdirSync, writeFileSync, readFileSync, chmodSync, existsSync } from "node:fs";
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
const TEMPLATES_DIR = join(__dirname, "..", "..", "templates", "project");

interface CreateProjectArgs {
  projectName: string;
  packageName: string;
  parentDir: string;
  minSdk: number;
  targetSdk: number;
  useCompose: boolean;
  agpVersion: string;
  kotlinVersion: string;
}

function readTemplate(name: string): string {
  return readFileSync(join(TEMPLATES_DIR, name), "utf-8");
}

function replaceAll(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function createProject(args: CreateProjectArgs, _env: Environment) {
  validateAbsolutePath(args.parentDir, "Parent directory");
  validatePackageName(args.packageName);
  validateSafeName(args.projectName, "Project name");

  const projectDir = join(args.parentDir, args.projectName);

  if (existsSync(projectDir)) {
    return errorResponse(`Directory already exists: ${projectDir}`);
  }

  try {
    const packagePath = args.packageName.replace(/\./g, "/");

    // Create directory structure
    const dirs = [
      projectDir,
      join(projectDir, "app", "src", "main", "java", packagePath),
      join(projectDir, "app", "src", "main", "res", "layout"),
      join(projectDir, "app", "src", "main", "res", "values"),
      join(projectDir, "app", "src", "main", "res", "mipmap-hdpi"),
      join(projectDir, "app", "src", "main", "res", "mipmap-mdpi"),
      join(projectDir, "app", "src", "main", "res", "mipmap-xhdpi"),
      join(projectDir, "app", "src", "main", "res", "mipmap-xxhdpi"),
      join(projectDir, "app", "src", "main", "res", "mipmap-xxxhdpi"),
      join(projectDir, "app", "src", "test", "java", packagePath),
      join(projectDir, "app", "src", "androidTest", "java", packagePath),
      join(projectDir, "gradle", "wrapper"),
    ];

    for (const dir of dirs) {
      mkdirSync(dir, { recursive: true });
    }

    // Compose-specific replacements
    const composeBuildFeatures = args.useCompose
      ? `buildFeatures {\n        compose = true\n    }`
      : `buildFeatures {\n        viewBinding = true\n    }`;

    const composePlugin = args.useCompose
      ? `id("org.jetbrains.kotlin.plugin.compose") version "${args.kotlinVersion}" apply false`
      : "";

    const appComposePlugin = args.useCompose ? `id("org.jetbrains.kotlin.plugin.compose")` : "";

    const composeDeps = args.useCompose
      ? [
          `implementation(platform("androidx.compose:compose-bom:2024.12.01"))`,
          `implementation("androidx.compose.ui:ui")`,
          `implementation("androidx.compose.ui:ui-graphics")`,
          `implementation("androidx.compose.ui:ui-tooling-preview")`,
          `implementation("androidx.compose.material3:material3")`,
          `implementation("androidx.activity:activity-compose:1.9.3")`,
          `debugImplementation("androidx.compose.ui:ui-tooling")`,
        ].join("\n    ")
      : [
          `implementation("androidx.appcompat:appcompat:1.7.0")`,
          `implementation("com.google.android.material:material:1.12.0")`,
          `implementation("androidx.constraintlayout:constraintlayout:2.2.0")`,
        ].join("\n    ");

    const theme = args.useCompose
      ? "@android:style/Theme.Material.Light.NoActionBar"
      : "@style/Theme.AppCompat.Light.DarkActionBar";

    const replacements: Record<string, string> = {
      PROJECT_NAME: args.projectName,
      PACKAGE_NAME: args.packageName,
      MIN_SDK: String(args.minSdk),
      TARGET_SDK: String(args.targetSdk),
      AGP_VERSION: args.agpVersion,
      KOTLIN_VERSION: args.kotlinVersion,
      COMPOSE_PLUGIN: composePlugin,
      BUILD_FEATURES: composeBuildFeatures,
      DEPENDENCIES: composeDeps,
      THEME: theme,
    };

    // Write root build.gradle.kts
    let rootBuild = readTemplate("build.gradle.kts.tmpl");
    rootBuild = replaceAll(rootBuild, replacements);
    writeFileSync(join(projectDir, "build.gradle.kts"), rootBuild);

    // Write settings.gradle.kts
    const settings = replaceAll(readTemplate("settings.gradle.kts.tmpl"), replacements);
    writeFileSync(join(projectDir, "settings.gradle.kts"), settings);

    // Write app/build.gradle.kts
    let appBuild = readTemplate("app-build.gradle.kts.tmpl");
    appBuild = replaceAll(appBuild, { ...replacements, COMPOSE_PLUGIN: appComposePlugin });
    writeFileSync(join(projectDir, "app", "build.gradle.kts"), appBuild);

    // Write AndroidManifest.xml
    const manifest = replaceAll(readTemplate("AndroidManifest.xml.tmpl"), replacements);
    writeFileSync(join(projectDir, "app", "src", "main", "AndroidManifest.xml"), manifest);

    // Write MainActivity
    const mainActivityTemplate = args.useCompose
      ? "MainActivityCompose.kt.tmpl"
      : "MainActivity.kt.tmpl";
    const mainActivity = replaceAll(readTemplate(mainActivityTemplate), replacements);
    writeFileSync(
      join(projectDir, "app", "src", "main", "java", packagePath, "MainActivity.kt"),
      mainActivity,
    );

    // Write activity_main.xml layout for non-Compose projects
    if (!args.useCompose) {
      const layoutXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context="${args.packageName}.MainActivity">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Hello World!"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>`;
      writeFileSync(
        join(projectDir, "app", "src", "main", "res", "layout", "activity_main.xml"),
        layoutXml,
      );
    }

    // Write strings.xml
    const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${args.projectName}</string>
</resources>`;
    writeFileSync(
      join(projectDir, "app", "src", "main", "res", "values", "strings.xml"),
      stringsXml,
    );

    // Write gradle.properties
    const gradleProps = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
${args.useCompose ? "" : ""}`;
    writeFileSync(join(projectDir, "gradle.properties"), gradleProps);

    // Write gradle wrapper properties
    const wrapperProps = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`;
    writeFileSync(join(projectDir, "gradle", "wrapper", "gradle-wrapper.properties"), wrapperProps);

    // Write gradlew script
    const gradlewScript = `#!/usr/bin/env sh
# Gradle startup script for POSIX
exec gradle "$@"`;
    writeFileSync(join(projectDir, "gradlew"), gradlewScript);
    chmodSync(join(projectDir, "gradlew"), 0o755);

    // Write gradlew.bat
    const gradlewBat = `@rem Gradle startup script for Windows
gradle %*`;
    writeFileSync(join(projectDir, "gradlew.bat"), gradlewBat);

    // Write .gitignore
    const gitignore = `*.iml
.gradle
/local.properties
/.idea
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties`;
    writeFileSync(join(projectDir, ".gitignore"), gitignore);

    // Write proguard-rules.pro
    writeFileSync(join(projectDir, "app", "proguard-rules.pro"), "");

    const createdFiles = [
      "build.gradle.kts",
      "settings.gradle.kts",
      "gradle.properties",
      "gradlew",
      ".gitignore",
      "app/build.gradle.kts",
      "app/src/main/AndroidManifest.xml",
      `app/src/main/java/${packagePath}/MainActivity.kt`,
      "app/src/main/res/values/strings.xml",
      ...(args.useCompose ? [] : ["app/src/main/res/layout/activity_main.xml"]),
      "gradle/wrapper/gradle-wrapper.properties",
    ];

    return textResponse(
      `Project "${args.projectName}" created at: ${projectDir}\n\nType: ${args.useCompose ? "Jetpack Compose" : "XML Views"}\nPackage: ${args.packageName}\nMin SDK: ${args.minSdk}\nTarget SDK: ${args.targetSdk}\n\nFiles created:\n${createdFiles.map((f) => `  - ${f}`).join("\n")}\n\nNote: Run 'gradle wrapper' in the project directory to download the proper Gradle wrapper JAR.`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to create project: ${message}`);
  }
}
