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
import { runGradleTask } from "../../../src/tools/build/run-task.js";
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

describe("runGradleTask", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when gradlew is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await runGradleTask(
      { projectDir: "/project", task: "test" },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
  });

  it("runs the requested task with extra args", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));

    await runGradleTask(
      { projectDir: "/project", task: "test", args: ["--info"] },
      env,
      createExtra(),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      ["test", "--info"],
      expect.any(Object),
    );
  });

  it("returns error on task failure", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("boom", 1));

    const result = await runGradleTask(
      { projectDir: "/project", task: "test" },
      env,
      createExtra(),
    );

    expect(result.isError).toBe(true);
  });

  it("passes the abort signal through to executeCommand", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("ok"));
    const controller = new AbortController();

    await runGradleTask(
      { projectDir: "/project", task: "test" },
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
