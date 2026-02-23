# android-pilot-mcp

[![npm version](https://img.shields.io/npm/v/android-pilot-mcp.svg)](https://www.npmjs.com/package/android-pilot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/sitharaj88/android-pilot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sitharaj88/android-pilot-mcp/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides comprehensive Android development tools for AI-powered editors. Gives MCP clients like **Claude Code**, **Cursor**, and **Windsurf** direct access to Gradle builds, device management, debugging, code scaffolding, APK analysis, intent testing, and SDK management — **39 tools** across **7 categories**.

## Features

- **Build & Lint** — Gradle build, task runner, dependency tree, project clean, and Android Lint analysis
- **Device Management** — List/create/start/stop emulators, install APKs, launch and manage apps, handle permissions, WiFi ADB, and file transfer
- **Debugging** — Logcat reading and filtering, screenshots, screen recording, UI hierarchy dumps, device info, and shell commands
- **Scaffolding** — Create full Android projects (Compose or XML), scaffold activities, fragments, and Compose screens with templates
- **APK Analysis** — Inspect APK size, versions, SDK targets, DEX references, file listings, manifests, and permissions
- **Intents & Deep Links** — Send intents, broadcast events, and test deep link URIs on connected devices
- **SDK Management** — List installed/available SDK packages and install new ones

## Prerequisites

- **Node.js** 20 or later
- **Android SDK** with platform-tools (adb), emulator, and command-line tools
- **Java JDK** 17 or later (for Gradle builds)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANDROID_HOME` | Yes* | Path to your Android SDK installation |
| `JAVA_HOME` | Recommended | Path to your JDK installation (needed for Gradle builds) |

\* If `ANDROID_HOME` is not set, the server also checks `ANDROID_SDK_ROOT` and the macOS default path `~/Library/Android/sdk`.

## Quick Start

### Install globally from npm

```bash
npm install -g android-pilot-mcp
```

### Run directly with npx (no install needed)

```bash
npx android-pilot-mcp
```

### Install from source

```bash
git clone https://github.com/sitharaj88/android-pilot-mcp.git
cd android-pilot-mcp
npm install
npm run build
```

## Configuration

### Claude Code

Add to your project's `.mcp.json` or global `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "android-pilot": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "android-pilot-mcp"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "android-pilot": {
      "type": "stdio",
      "command": "android-pilot-mcp"
    }
  }
}
```

### Cursor

Open Cursor Settings > MCP and add a new server, or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "android-pilot": {
      "command": "npx",
      "args": ["-y", "android-pilot-mcp"]
    }
  }
}
```

### Windsurf

Open Windsurf Settings > MCP and add:

```json
{
  "mcpServers": {
    "android-pilot": {
      "command": "npx",
      "args": ["-y", "android-pilot-mcp"]
    }
  }
}
```

### Other MCP Clients

Any MCP client that supports stdio transport can use this server. Point it at the `android-pilot-mcp` command or `npx -y android-pilot-mcp`.

## Tool Reference

### Build & Lint (6 tools)

| Tool | Description |
|------|-------------|
| `gradle_build` | Run a Gradle build with debug/release variant and optional module targeting |
| `gradle_task` | Run an arbitrary Gradle task (test, lint, connectedAndroidTest, etc.) |
| `gradle_list_tasks` | List all available Gradle tasks in a project |
| `gradle_clean` | Clean the build output of a project |
| `gradle_dependencies` | Show the dependency tree for a module |
| `lint_run` | Run Android Lint analysis and return warnings, errors, and suggestions |

### Device Management (15 tools)

| Tool | Description |
|------|-------------|
| `device_list` | List all connected devices and running emulators |
| `avd_list` | List all available Android Virtual Devices |
| `avd_create` | Create a new AVD with a specified system image and device profile |
| `emulator_start` | Start an emulator by AVD name (cold boot, headless, wipe options) |
| `emulator_stop` | Stop a running emulator |
| `apk_install` | Install an APK on a device or emulator |
| `app_launch` | Launch an app by package name |
| `app_stop` | Force stop a running app |
| `app_clear_data` | Clear all data for an installed app |
| `app_permission` | Grant or revoke a runtime permission |
| `app_permissions_list` | List all permissions for an app (granted and denied) |
| `adb_wifi_connect` | Connect to a device over WiFi ADB |
| `adb_wifi_disconnect` | Disconnect a WiFi ADB connection |
| `file_push` | Push a local file to a device |
| `file_pull` | Pull a file from a device to the local machine |

### Debugging (7 tools)

| Tool | Description |
|------|-------------|
| `logcat_read` | Read logcat with filtering by tag, priority, time, or search string |
| `logcat_clear` | Clear the logcat buffer |
| `device_screenshot` | Capture a screenshot as base64-encoded PNG |
| `device_info` | Get device details (model, OS, screen density, etc.) |
| `device_shell` | Execute an arbitrary ADB shell command |
| `ui_dump` | Dump the UI hierarchy as XML via UI Automator |
| `screen_record` | Record the device screen as MP4 |

### Scaffolding (4 tools)

| Tool | Description |
|------|-------------|
| `project_create` | Create a new Android project with Kotlin and Gradle KTS (Compose or XML) |
| `scaffold_activity` | Generate an Activity from a template with optional layout |
| `scaffold_fragment` | Generate a Fragment from a template with optional layout |
| `scaffold_compose_screen` | Generate a Compose screen with preview and optional ViewModel |

### APK Analysis (2 tools)

| Tool | Description |
|------|-------------|
| `apk_analyze` | Analyze APK size, version, SDK targets, DEX refs, and optionally full manifest |
| `apk_permissions` | List all permissions declared in an APK |

### Intents & Deep Links (3 tools)

| Tool | Description |
|------|-------------|
| `intent_send` | Send an intent with action, data URI, component, extras, and flags |
| `broadcast_send` | Send a broadcast intent |
| `deeplink_test` | Test a deep link URI on a connected device |

### SDK Management (2 tools)

| Tool | Description |
|------|-------------|
| `sdk_list` | List installed or available SDK packages, system images, and build tools |
| `sdk_install` | Install SDK packages (platforms, system images, build tools, etc.) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and pull request guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
