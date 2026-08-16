import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { existsSync } from "node:fs";
import { executeCommand } from "../../../src/executor.js";
import { lintRun } from "../../../src/tools/build/lint-run.js";
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

describe("lintRun", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedExistsSync.mockImplementation((path) => String(path).endsWith("gradlew"));
  });

  it("returns error when gradlew is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await lintRun(
      { projectDir: "/project", module: ":app", fatal: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
  });

  it("returns structuredContent on success", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("No issues found."));

    const result = await lintRun(
      { projectDir: "/project", module: ":app", fatal: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ success: true, exitCode: 0 });
  });

  it("returns isError with structuredContent when fatal issues are found and fatal is true", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("Error: something bad", 1));

    const result = await lintRun(
      { projectDir: "/project", module: ":app", fatal: true },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({ success: false, exitCode: 1 });
  });

  it("returns a normal response with structuredContent when fatal is false, even on failure", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("Error: something bad", 1));

    const result = await lintRun(
      { projectDir: "/project", module: ":app", fatal: false },
      env,
      createExtra(),
    );

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ success: false, exitCode: 1 });
  });

  it("passes the abort signal through to executeCommand", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));
    const controller = new AbortController();

    await lintRun(
      { projectDir: "/project", module: ":app", fatal: false },
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
