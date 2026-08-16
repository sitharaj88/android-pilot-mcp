import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { existsSync } from "node:fs";
import { executeCommand } from "../../../src/executor.js";
import { showDependencies } from "../../../src/tools/build/manage-dependencies.js";
import type { ToolExtra } from "../../../src/tools/build/extra.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedExecuteCommand = vi.mocked(executeCommand);

function createExtra(overrides: Partial<ToolExtra> = {}): ToolExtra {
  return {
    signal: new AbortController().signal,
    sendNotification: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn(),
    requestId: "test-request-id",
    ...overrides,
  } as unknown as ToolExtra;
}

describe("showDependencies", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when gradlew is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await showDependencies(
      { projectDir: "/project", module: ":app" },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
  });

  it("includes the configuration flag when provided", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("+--- a:b:1.0"));

    await showDependencies(
      { projectDir: "/project", module: ":app", configuration: "debugCompileClasspath" },
      env,
      createExtra(),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      [":app:dependencies", "--configuration", "debugCompileClasspath"],
      expect.any(Object),
    );
  });

  it("returns error on failure", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("boom", 1));

    const result = await showDependencies(
      { projectDir: "/project", module: ":app" },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
  });

  it("passes the abort signal through to executeCommand", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));
    const controller = new AbortController();

    await showDependencies(
      { projectDir: "/project", module: ":app" },
      env,
      createExtra({ signal: controller.signal }),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
