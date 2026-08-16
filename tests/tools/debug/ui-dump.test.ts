import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { uiDump } from "../../../src/tools/debug/ui-dump.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

function queueSuccessfulDump(xml: string): void {
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("")); // dump
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(xml)); // cat
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("")); // rm cleanup
}

function remotePathFromCall(call: unknown[]): string {
  const args = call[1] as string[];
  return args[args.length - 1];
}

describe("uiDump", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dumps and returns the UI hierarchy", async () => {
    queueSuccessfulDump("<hierarchy></hierarchy>");

    const result = await uiDump({ compressed: true }, env);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("<hierarchy></hierarchy>");
  });

  it("uses a unique remote path per invocation and cleans it up", async () => {
    queueSuccessfulDump("<hierarchy>1</hierarchy>");
    await uiDump({ compressed: true }, env);
    const [dumpCall1, , rmCall1] = mockedExecuteCommand.mock.calls;
    const dumpPath1 = remotePathFromCall(dumpCall1);
    const rmPath1 = remotePathFromCall(rmCall1);
    expect(dumpPath1).toBe(rmPath1);
    expect(dumpPath1).toMatch(/^\/sdcard\/window_dump_.+\.xml$/);

    vi.clearAllMocks();
    queueSuccessfulDump("<hierarchy>2</hierarchy>");
    await uiDump({ compressed: true }, env);
    const [dumpCall2] = mockedExecuteCommand.mock.calls;
    const dumpPath2 = remotePathFromCall(dumpCall2);

    expect(dumpPath2).not.toBe(dumpPath1);
  });

  it("cleans up the remote file even when the dump fails", async () => {
    mockedExecuteCommand.mockResolvedValueOnce(mockFailureResult("uiautomator not found", 1));
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(""));

    const result = await uiDump({ compressed: true }, env);
    expect(result.isError).toBe(true);
    expect(mockedExecuteCommand).toHaveBeenCalledTimes(2);
    const rmArgs = mockedExecuteCommand.mock.calls[1][1] as string[];
    expect(rmArgs).toEqual(expect.arrayContaining(["rm", "-f"]));
  });

  it("rejects an invalid device id", async () => {
    await expect(uiDump({ deviceId: "bad id!", compressed: true }, env)).rejects.toThrow(
      /Invalid device ID/,
    );
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });
});
