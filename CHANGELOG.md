# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-16

### Added

- All 39 tools migrated from `server.tool()` to `server.registerTool()`, adding
  human-readable `title`s and tool annotations (`readOnlyHint`, `destructiveHint`,
  `idempotentHint`, `openWorldHint`) so clients can reason about tool behavior
  before calling them.
- Structured output (`outputSchema` + `structuredContent`) on `device_list`,
  `avd_list`, `app_permissions_list`, `device_info`, `gradle_build`,
  `gradle_list_tasks`, `lint_run`, and `apk_permissions`.
- **MCP Resources:** `android://devices`, `android://avds`,
  `android://logcat/{deviceId}`, `android://uidump/{deviceId}` for read access
  to live device state without invoking a tool.
- **MCP Prompts:** `debug-crash`, `setup-emulator`, `install-and-test-apk`,
  `ui-inspect`, `performance-check`, `release-preflight` — ready-made
  multi-step workflows exposed via the MCP prompts capability.
- Progress notifications for long-running tools (`gradle_build`,
  `emulator_start`, `sdk_install`, `screen_record`).
- Request cancellation support: an `AbortSignal` is threaded through
  long-running tool calls so clients can cancel in-flight operations.
- Elicitation confirmations for destructive operations (`app_clear_data`,
  `avd_create` when overwriting an existing AVD, `sdk_install` license
  auto-accept) on clients that support elicitation, with a graceful fallback
  (proceed without prompting) on clients that don't.
- MCP logging capability (`notifications/message`) for structured server logs.
- Linux (`~/Android/Sdk`) and Windows SDK path fallbacks, in addition to the
  existing macOS default.

### Changed

- `screen_record` duration is now clamped to 1-180 seconds by input validation
  instead of being an undocumented convention.
- Server version reported to MCP clients is now read from `package.json`
  instead of being hardcoded.
- Upgraded `zod` to v4.

### Fixed

- `emulator_start` now tracks the specific serial of the emulator it launched
  (diffing `adb devices` before/after) and targets it with `adb -s` for boot
  checks, instead of assuming a single emulator is running.
- `screen_record` and `ui_dump` now use unique remote file paths per
  invocation and clean up the remote file afterward, preventing collisions
  between concurrent or repeated calls.
- `deviceId` is validated on every tool that accepts one, and intent arguments
  (`intent_send`, `broadcast_send`, `deeplink_test`) are validated before use.
- `apkanalyzer` is now resolved by checking multiple `cmdline-tools`
  locations instead of a single hardcoded path.
- A missing or misconfigured Android SDK no longer crashes the server at
  startup — tools instead return a clean error asking the user to set
  `ANDROID_HOME`.
- Output truncation is now byte-accurate instead of truncating by character
  count, which could previously split multi-byte UTF-8 sequences.

## [1.0.0] - 2025-02-20

### Added

- Initial release with 39 tools across 7 categories.
- **Build & Lint:** `gradle_build`, `gradle_task`, `gradle_list_tasks`,
  `gradle_clean`, `gradle_dependencies`, `lint_run`.
- **Device Management:** `device_list`, `avd_list`, `avd_create`,
  `emulator_start`, `emulator_stop`, `apk_install`, `app_launch`, `app_stop`,
  `app_clear_data`, `app_permission`, `app_permissions_list`,
  `adb_wifi_connect`, `adb_wifi_disconnect`, `file_push`, `file_pull`.
- **Debugging:** `logcat_read`, `logcat_clear`, `device_screenshot`,
  `device_info`, `device_shell`, `ui_dump`, `screen_record`.
- **Scaffolding:** `project_create`, `scaffold_activity`, `scaffold_fragment`,
  `scaffold_compose_screen`.
- **APK Analysis:** `apk_analyze`, `apk_permissions`.
- **Intents & Deep Links:** `intent_send`, `broadcast_send`, `deeplink_test`.
- **SDK Management:** `sdk_list`, `sdk_install`.
- MCP stdio transport support for Claude Code, Cursor, Windsurf, and other
  MCP-compatible clients.
- Automatic Android SDK environment detection.
- Kotlin/Compose/XML project and component scaffolding templates.
- Structured logging with configurable log levels.
- Input validation and security hardening.
- Graceful shutdown handling.

[1.1.0]: https://github.com/sitharaj88/android-pilot-mcp/releases/tag/v1.1.0
[1.0.0]: https://github.com/sitharaj88/android-pilot-mcp/releases/tag/v1.0.0
