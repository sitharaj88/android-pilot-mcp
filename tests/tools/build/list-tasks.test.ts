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
import { listGradleTasks, parseGradleTaskListing } from "../../../src/tools/build/list-tasks.js";
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

const GRADLE_TASKS_OUTPUT = `
------------------------------------------------------------
Tasks runnable from root project 'demo'
------------------------------------------------------------

Build tasks
-----------
assemble - Assembles main output for variant debug
assembleDebug - Assembles main output for variant debug
build - Assembles and tests this project.

Verification tasks
-------------------
check - Runs all checks.
lint - Runs lint on all variants.
test - Run unit tests for all variants.

Rules
-----
Pattern: clean<TaskName>: Cleans the output files of a task.

To see all tasks and more detail, run gradlew tasks --all
`;

describe("parseGradleTaskListing", () => {
  it("parses task name/description pairs", () => {
    const tasks = parseGradleTaskListing(GRADLE_TASKS_OUTPUT);

    expect(tasks).toContainEqual({
      name: "assemble",
      description: "Assembles main output for variant debug",
    });
    expect(tasks).toContainEqual({ name: "check", description: "Runs all checks." });
    expect(tasks).toContainEqual({ name: "lint", description: "Runs lint on all variants." });
  });

  it("ignores section headers and dashed separator lines", () => {
    const tasks = parseGradleTaskListing(GRADLE_TASKS_OUTPUT);
    const names = tasks.map((t) => t.name);

    expect(names).not.toContain("Build");
    expect(names).not.toContain("Verification");
    expect(names).not.toContain("Rules");
    expect(names.some((n) => /^-+$/.test(n))).toBe(false);
  });

  it("returns an empty array for garbage input instead of throwing", () => {
    expect(parseGradleTaskListing("")).toEqual([]);
    expect(parseGradleTaskListing("\n\n---\n\n")).toEqual([]);
    expect(() => parseGradleTaskListing("not gradle output at all")).not.toThrow();
  });

  it("returns a partial list when only some lines are parseable", () => {
    const mixed = "assemble - Assembles main output\nsomeTaskWithNoDescription\ncheck - Runs checks";
    const tasks = parseGradleTaskListing(mixed);

    expect(tasks).toEqual([
      { name: "assemble", description: "Assembles main output" },
      { name: "check", description: "Runs checks" },
    ]);
  });
});

describe("listGradleTasks", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when gradlew is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await listGradleTasks({ projectDir: "/project" }, env, createExtra());

    expect(result.isError).toBe(true);
  });

  it("returns structuredContent with parsed tasks on success", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(GRADLE_TASKS_OUTPUT));

    const result = await listGradleTasks({ projectDir: "/project" }, env, createExtra());

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toBeDefined();
    const { tasks } = result.structuredContent as { tasks: Array<{ name: string }> };
    expect(tasks.map((t) => t.name)).toEqual(
      expect.arrayContaining(["assemble", "assembleDebug", "build", "check", "lint", "test"]),
    );
  });

  it("falls back to an empty tasks list when output cannot be parsed", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("nothing parseable here"));

    const result = await listGradleTasks({ projectDir: "/project" }, env, createExtra());

    expect(result.structuredContent).toEqual({ tasks: [] });
  });

  it("returns an error response on failure without structuredContent", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("boom", 1));

    const result = await listGradleTasks({ projectDir: "/project" }, env, createExtra());

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it("passes the abort signal through to executeCommand", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(GRADLE_TASKS_OUTPUT));
    const controller = new AbortController();

    await listGradleTasks(
      { projectDir: "/project" },
      env,
      createExtra({ signal: controller.signal }),
    );

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("scopes the task listing to a module when provided", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(GRADLE_TASKS_OUTPUT));

    await listGradleTasks({ projectDir: "/project", module: ":app" }, env, createExtra());

    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([":app:tasks", "--all"]),
      expect.any(Object),
    );
  });
});
