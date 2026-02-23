# Contributing to android-pilot-mcp

Thank you for your interest in contributing. This document covers the
development workflow, coding standards, and pull request process.

## Development Setup

### Prerequisites

- Node.js 20 or later
- Android SDK with platform-tools, emulator, and command-line tools
- Java JDK 17 or later
- An Android emulator or physical device (for testing device/debug tools)

### Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/android-pilot-mcp.git
   cd android-pilot-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Run in development mode (watches for changes):

   ```bash
   npm run dev
   ```

5. Run tests:

   ```bash
   npm test
   ```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript and copy templates |
| `npm run dev` | Watch mode for development |
| `npm start` | Start the MCP server |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | Type check without emitting |
| `npm run check` | Run typecheck + lint + format check |

## Project Structure

```
src/
  index.ts            # Entry point -- registers all tool categories
  environment.ts      # Android SDK and JDK environment detection
  executor.ts         # Command execution utilities
  types.ts            # Shared TypeScript interfaces
  utils/
    logger.ts         # Structured stderr logging
    response.ts       # MCP response builders
    validation.ts     # Input validation helpers
  tools/
    build/            # Gradle build, task, clean, dependencies, lint
    device/           # Emulator, AVD, APK install, app lifecycle, file transfer
    debug/            # Logcat, screenshots, screen recording, UI dumps, shell
    scaffold/         # Project creation, activity/fragment/compose scaffolding
    analyze/          # APK analysis and permissions
    intent/           # Intent sending, broadcasts, deep link testing
    sdk/              # SDK package listing and installation
  templates/          # Kotlin/XML/Compose file templates for scaffolding
```

## Coding Standards

- **Language:** TypeScript with strict mode enabled
- **Module system:** ES modules (`"type": "module"` in package.json)
- **Target:** ES2022
- **Formatting:** Prettier (2 spaces, double quotes, trailing commas)
- **Linting:** ESLint with typescript-eslint
- **Response pattern:** Use `textResponse()`, `errorResponse()`, `imageResponse()` from `utils/response.ts`
- **Validation:** Use validators from `utils/validation.ts` for user inputs
- **Error handling:** Wrap tool handlers with `withErrorHandling()` for automatic ValidationError catching
- **Logging:** Use `logger` from `utils/logger.ts` (writes to stderr, as required by MCP)

### Adding a New Tool

1. Create a new handler file in the appropriate `src/tools/<category>/` directory.
2. Export a function that accepts the tool arguments and an `Environment` object.
3. Use validators for user inputs (paths, package names, etc.).
4. Use response helpers for return values.
5. Register the tool in the category's `index.ts` using `server.tool()`, wrapped with `withErrorHandling()`.
6. Provide a clear tool name (snake_case), description, and Zod schema for all parameters.
7. Add tests in `tests/tools/<category>/`.
8. Update the tool reference table in `README.md`.

## Pull Request Process

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and verify:

   ```bash
   npm run check
   npm test
   npm run build
   ```

3. Write a clear commit message following conventional commits:

   ```
   feat: add tool for <what it does>
   fix: correct <what was wrong>
   docs: update README with <what changed>
   ```

4. Push your branch and open a pull request against `main`.

5. In your PR description, include:
   - What the change does and why
   - Which tools are added or modified
   - How to test the change

## Reporting Issues

Open an issue on GitHub with:
- A clear title describing the problem
- Steps to reproduce
- Expected vs. actual behavior
- Your environment (OS, Node.js version, Android SDK version)

## License

By contributing, you agree that your contributions will be licensed under
the MIT License.
