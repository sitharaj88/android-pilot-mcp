# Android Pilot MCP

[![npm version](https://img.shields.io/npm/v/android-pilot-mcp.svg)](https://www.npmjs.com/package/android-pilot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/sitharaj88/android-pilot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sitharaj88/android-pilot-mcp/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that gives AI-powered editors full control over Android development. Build, test, debug, and deploy Android apps entirely through natural language.

Works with **Claude Code**, **Cursor**, **Windsurf**, and any MCP-compatible client.

**[Read the full documentation](https://sitharaj88.github.io/android-pilot-mcp)**

## What Can It Do?

Just tell your AI editor what you want:

```
"Build my Android project"
"Create a new Compose project called MyApp with package com.example.myapp"
"List my connected devices"
"Install the debug APK and launch the app"
"Show error logs for tag CrashHandler"
"Take a screenshot of my device"
"Run lint and treat fatal issues as errors"
"Test deep link myapp://profile/123 on my device"
```

No manual adb commands. No switching between terminal and IDE. Your AI editor handles it all.

## What's New in 1.1.0

- All 39 tools now use `registerTool()` with descriptive titles and [tool annotations](#tool-annotations--structured-output) (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) so clients can reason about a tool before calling it.
- Structured, machine-readable output on key tools (`device_list`, `avd_list`, `app_permissions_list`, `device_info`, `gradle_build`, `gradle_list_tasks`, `lint_run`, `apk_permissions`) alongside the usual human-readable text.
- New [MCP Resources](#mcp-resources) for live device state and new [MCP Prompts](#mcp-prompts) for common multi-step workflows.
- Progress notifications, request cancellation, and elicitation confirmations for destructive actions — see [Progress, Cancellation & Confirmations](#progress-cancellation--confirmations).
- Android SDK detection now falls back to the standard Linux (`~/Android/Sdk`) and Windows (`%LOCALAPPDATA%\Android\Sdk`) install locations, in addition to the macOS default.
- A missing or misconfigured SDK no longer crashes the server — tools return a clean error telling you to set `ANDROID_HOME`.

See [CHANGELOG.md](CHANGELOG.md) for the full list of changes.

## 39 Tools Across 7 Categories

| Category | Tools | What It Covers |
|----------|:-----:|----------------|
| **Build & Lint** | 6 | Gradle build, task runner, clean, dependency tree, lint analysis |
| **Device Management** | 15 | Emulators, APK install, app lifecycle, permissions, WiFi ADB, file transfer |
| **Debugging** | 7 | Logcat, screenshots, screen recording, UI hierarchy, shell commands |
| **Scaffolding** | 4 | Project creation (Compose/XML), activities, fragments, Compose screens |
| **APK Analysis** | 2 | APK inspection, size, manifest, permissions audit |
| **Intents & Deep Links** | 3 | Send intents, broadcast events, test deep links |
| **SDK Management** | 2 | List/install SDK packages, system images, build tools |

## Quick Start

### Install and run with npx (no install needed)

```bash
npx android-pilot-mcp
```

### Or install globally

```bash
npm install -g android-pilot-mcp
```

## Prerequisites

- **Node.js** 20+
- **Android SDK** with platform-tools (adb), emulator, and command-line tools
- **Java JDK** 17+ (for Gradle builds)

The server looks for the Android SDK via `ANDROID_HOME`, `ANDROID_SDK_ROOT`, or the platform default install location: `~/Library/Android/sdk` on macOS, `~/Android/Sdk` on Linux, or `%LOCALAPPDATA%\Android\Sdk` on Windows. If none of these resolve to a real directory, the server still starts — tools just return a clean error telling you to set `ANDROID_HOME` instead of crashing.

## Editor Setup

### Claude Code

Add to `.mcp.json` (project) or `~/.claude/mcp.json` (global):

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

### Cursor

Add via Cursor Settings > MCP, or edit `~/.cursor/mcp.json`:

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

Add via Windsurf Settings > MCP:

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

Any MCP client with stdio transport support works. Point it at `npx -y android-pilot-mcp`.

## Tool Reference

### Build & Lint

| Tool | Description |
|------|-------------|
| `gradle_build` | Run debug/release builds with optional module targeting |
| `gradle_task` | Run any Gradle task (test, lint, bundle, connectedAndroidTest, etc.) |
| `gradle_list_tasks` | List all available Gradle tasks |
| `gradle_clean` | Clean build output |
| `gradle_dependencies` | Show the dependency tree for a module |
| `lint_run` | Run Android Lint — returns warnings, errors, and suggestions with file locations |

### Device Management

| Tool | Description |
|------|-------------|
| `device_list` | List connected devices and running emulators |
| `avd_list` | List available AVDs |
| `avd_create` | Create a new AVD with system image and device profile |
| `emulator_start` | Start an emulator (cold boot, headless, wipe data options) |
| `emulator_stop` | Stop a running emulator |
| `apk_install` | Install an APK on a device |
| `app_launch` | Launch an app by package name |
| `app_stop` | Force stop a running app |
| `app_clear_data` | Clear all app data (equivalent to Clear Storage) |
| `app_permission` | Grant or revoke a runtime permission |
| `app_permissions_list` | List all permissions with granted/denied status |
| `adb_wifi_connect` | Switch to WiFi ADB |
| `adb_wifi_disconnect` | Disconnect WiFi ADB |
| `file_push` | Push a file to the device |
| `file_pull` | Pull a file from the device |

### Debugging

| Tool | Description |
|------|-------------|
| `logcat_read` | Read logcat with tag, priority, time, and text filters |
| `logcat_clear` | Clear the logcat buffer |
| `device_screenshot` | Capture a screenshot as PNG |
| `device_info` | Get device model, OS version, screen density, and more |
| `device_shell` | Execute an ADB shell command |
| `ui_dump` | Dump UI hierarchy as XML via UI Automator |
| `screen_record` | Record the screen as MP4 (duration is clamped to 1-180 seconds) |

### Scaffolding

| Tool | Description |
|------|-------------|
| `project_create` | Create a new Android project with Kotlin + Gradle KTS (Compose or XML) |
| `scaffold_activity` | Generate an Activity with optional XML layout |
| `scaffold_fragment` | Generate a Fragment with optional XML layout |
| `scaffold_compose_screen` | Generate a Compose screen with preview and optional ViewModel |

### APK Analysis

| Tool | Description |
|------|-------------|
| `apk_analyze` | Inspect size, version, SDK targets, DEX references, manifest |
| `apk_permissions` | List all permissions declared in an APK |

### Intents & Deep Links

| Tool | Description |
|------|-------------|
| `intent_send` | Send an intent with action, data URI, component, extras, and flags |
| `broadcast_send` | Send a broadcast intent |
| `deeplink_test` | Test a deep link URI on a connected device |

### SDK Management

| Tool | Description |
|------|-------------|
| `sdk_list` | List installed or available SDK packages |
| `sdk_install` | Install SDK packages (platforms, system images, build tools) |

## MCP Resources

Beyond tools, the server exposes read-only [MCP Resources](https://modelcontextprotocol.io/docs/concepts/resources) for live device state, so a client can read this data directly without invoking a tool call:

| Resource URI | Description |
|---------------|-------------|
| `android://devices` | Currently connected devices and emulators (`adb devices -l`) |
| `android://avds` | Available AVD names on this machine |
| `android://logcat/{deviceId}` | Last 200 lines of logcat for a specific device |
| `android://uidump/{deviceId}` | UI Automator XML hierarchy dump for a specific device |

## MCP Prompts

The server also ships ready-made [MCP Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) — pre-written, parameterized instructions that chain multiple tools into a common workflow. Editors with prompt support can surface these as slash commands or quick actions:

| Prompt | Description |
|--------|-------------|
| `debug-crash` | Reproduce, capture, and diagnose a crash for an installed app |
| `setup-emulator` | Install a system image and create/start an AVD |
| `install-and-test-apk` | Analyze, install, launch, and check logs for an APK |
| `ui-inspect` | Capture the UI hierarchy and a screenshot to locate elements |
| `performance-check` | Build release, inspect APK size, and watch runtime logs for perf issues |
| `release-preflight` | Clean build, lint, and analyze the APK before a release |

## Tool Annotations & Structured Output

Every tool is registered with a `title` and MCP [tool annotations](https://modelcontextprotocol.io/docs/concepts/tools#tool-annotations) — `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` — so a client can tell at a glance whether a tool is safe to call automatically, destructive enough to confirm first, or interacts with something outside the local system (e.g. `adb_wifi_connect`, network SDK downloads).

Several tools also return structured, machine-readable output (`outputSchema` / `structuredContent`) in addition to their human-readable text response: `device_list`, `avd_list`, `app_permissions_list`, `device_info`, `gradle_build`, `gradle_list_tasks`, `lint_run`, and `apk_permissions`.

## Progress, Cancellation & Confirmations

- **Progress notifications** — long-running tools (`gradle_build`, `emulator_start`, `sdk_install`, `screen_record`) send MCP progress notifications while they work, so a client can show live status instead of a silent wait.
- **Cancellation** — those same tools accept an `AbortSignal` from the client, so an in-flight build, emulator boot, SDK install, or recording can be cancelled cleanly.
- **Elicitation confirmations** — destructive operations (`app_clear_data`, overwriting an existing AVD with `avd_create`, and the license auto-accept in `sdk_install`) ask for confirmation via MCP elicitation on clients that support it. On clients that don't support elicitation, the server falls back to proceeding without a prompt rather than failing.

## Documentation

Full documentation with guides, tool reference, and a prompt cookbook is available at:

**[https://sitharaj88.github.io/android-pilot-mcp](https://sitharaj88.github.io/android-pilot-mcp)**

Includes:
- Step-by-step setup guides
- Detailed tool reference for all 39 tools
- MCP Resources and MCP Prompts reference
- Prompt cookbook with 65+ copy-paste prompts
- Real-world workflows (build, debug, deploy)
- Architecture overview

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and pull request guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.
