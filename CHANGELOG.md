# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/sitharaj88/android-pilot-mcp/releases/tag/v1.0.0
