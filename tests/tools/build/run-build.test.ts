import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult, mockTimeoutResult } from "../../helpers/fixtures.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { existsSync } from "node:fs";
import { executeCommand } from "../../../src/executor.js";
import { runGradleBuild } from "../../../src/tools/build/run-build.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedExecuteCommand = vi.mocked(executeCommand);

describe("runGradleBuild", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when gradlew is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
    );

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("No Gradle wrapper found");
  });

  it("builds debug variant successfully", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
    );

    expect(result.isError).toBeUndefined();
    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.stringContaining("gradlew"),
      expect.arrayContaining(["assembleDebug"]),
      expect.any(Object),
    );
  });

  it("builds release variant", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    await runGradleBuild(
      { projectDir: "/project", variant: "release", stacktrace: false },
      env,
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["assembleRelease"]),
      expect.any(Object),
    );
  });

  it("builds specific module", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    await runGradleBuild(
      { projectDir: "/project", variant: "debug", module: ":app", stacktrace: false },
      env,
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([":app:assembleDebug"]),
      expect.any(Object),
    );
  });

  it("includes stacktrace flag", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("BUILD SUCCESSFUL"));

    await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: true },
      env,
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["--stacktrace"]),
      expect.any(Object),
    );
  });

  it("returns error on build failure", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("Compilation failed", 1));

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
    );

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Build failed");
  });

  it("returns error on timeout", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockTimeoutResult());

    const result = await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
    );

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("TIMED OUT");
  });

  it("uses 300s timeout for builds", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));

    await runGradleBuild(
      { projectDir: "/project", variant: "debug", stacktrace: false },
      env,
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ timeout: 300_000 }),
    );
  });
});
