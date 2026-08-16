import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { appClearData } from "../../../src/tools/device/app-clear-data.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

function mockServer(opts: {
  elicitationSupported: boolean;
  elicitResult?: { action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> };
}): McpServer {
  const elicitInput = vi.fn().mockResolvedValue(opts.elicitResult ?? { action: "decline" });
  return {
    server: {
      getClientCapabilities: () => (opts.elicitationSupported ? { elicitation: {} } : undefined),
      elicitInput,
    },
  } as unknown as McpServer;
}

describe("appClearData", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears data without prompting when the client has no elicitation capability", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("Success\n"));
    const server = mockServer({ elicitationSupported: false });

    const result = await appClearData({ packageName: "com.example.app" }, env, server);

    expect(result.isError).toBeUndefined();
    expect(mockedExecuteCommand).toHaveBeenCalledTimes(1);
  });

  it("proceeds when the user confirms via elicitation", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("Success\n"));
    const server = mockServer({
      elicitationSupported: true,
      elicitResult: { action: "accept", content: { confirm: true } },
    });

    const result = await appClearData({ packageName: "com.example.app" }, env, server);

    expect(result.isError).toBeUndefined();
    expect(mockedExecuteCommand).toHaveBeenCalledTimes(1);
  });

  it("cancels and never touches adb when the user declines elicitation", async () => {
    const server = mockServer({
      elicitationSupported: true,
      elicitResult: { action: "decline" },
    });

    const result = await appClearData({ packageName: "com.example.app" }, env, server);

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("cancelled");
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  it("cancels when the user does not check confirm", async () => {
    const server = mockServer({
      elicitationSupported: true,
      elicitResult: { action: "accept", content: { confirm: false } },
    });

    const result = await appClearData({ packageName: "com.example.app" }, env, server);

    expect(result.isError).toBe(true);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  it("returns an error response when adb clear fails", async () => {
    const server = mockServer({ elicitationSupported: false });
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("package not found", 1));

    const result = await appClearData({ packageName: "com.example.app" }, env, server);
    expect(result.isError).toBe(true);
  });

  it("rejects an invalid device id", async () => {
    const server = mockServer({ elicitationSupported: false });
    await expect(
      appClearData({ packageName: "com.example.app", deviceId: "bad id!" }, env, server),
    ).rejects.toThrow(/Invalid device ID/);
  });
});
