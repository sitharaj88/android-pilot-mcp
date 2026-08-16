import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommandWithStdin: vi.fn(),
}));

import { executeCommandWithStdin } from "../../../src/executor.js";
import { sdkInstall } from "../../../src/tools/sdk/sdk-install.js";

const mockedExec = vi.mocked(executeCommandWithStdin);

function makeServer(opts: {
  elicitationCapable?: boolean;
  elicitResult?: { action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> };
}) {
  const elicitInput = vi
    .fn()
    .mockResolvedValue(opts.elicitResult ?? { action: "accept", content: { confirm: true } });
  return {
    server: {
      getClientCapabilities: vi
        .fn()
        .mockReturnValue(opts.elicitationCapable ? { elicitation: {} } : {}),
      elicitInput,
    },
  } as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
}

function makeExtra(
  overrides: Partial<{ signal: AbortSignal; _meta: { progressToken?: string } }> = {},
) {
  return {
    signal: overrides.signal ?? new AbortController().signal,
    sendNotification: vi.fn().mockResolvedValue(undefined),
    _meta: overrides._meta,
  } as unknown as import("@modelcontextprotocol/sdk/shared/protocol.js").RequestHandlerExtra<
    import("@modelcontextprotocol/sdk/types.js").ServerRequest,
    import("@modelcontextprotocol/sdk/types.js").ServerNotification
  >;
}

describe("sdkInstall", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("installs without prompting when the client has no elicitation capability", async () => {
    mockedExec.mockResolvedValue(mockSuccessResult("installed"));
    const server = makeServer({ elicitationCapable: false });
    const extra = makeExtra();

    const result = await sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

    expect(result.isError).toBeUndefined();
    expect(mockedExec).toHaveBeenCalledTimes(1);
  });

  it("proceeds when the client accepts the elicitation with confirm=true", async () => {
    mockedExec.mockResolvedValue(mockSuccessResult("installed"));
    const server = makeServer({
      elicitationCapable: true,
      elicitResult: { action: "accept", content: { confirm: true } },
    });
    const extra = makeExtra();

    const result = await sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

    expect(result.isError).toBeUndefined();
    expect(mockedExec).toHaveBeenCalledTimes(1);
  });

  it("cancels when the client declines the elicitation", async () => {
    const server = makeServer({
      elicitationCapable: true,
      elicitResult: { action: "decline" },
    });
    const extra = makeExtra();

    const result = await sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("cancelled");
    expect(mockedExec).not.toHaveBeenCalled();
  });

  it("cancels when the client accepts but confirm is not true", async () => {
    const server = makeServer({
      elicitationCapable: true,
      elicitResult: { action: "accept", content: { confirm: false } },
    });
    const extra = makeExtra();

    const result = await sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

    expect(result.isError).toBe(true);
    expect(mockedExec).not.toHaveBeenCalled();
  });

  it("threads the abort signal into executeCommandWithStdin", async () => {
    mockedExec.mockResolvedValue(mockSuccessResult("installed"));
    const server = makeServer({ elicitationCapable: false });
    const controller = new AbortController();
    const extra = makeExtra({ signal: controller.signal });

    await sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

    expect(mockedExec).toHaveBeenCalledWith(
      env.sdkmanagerPath,
      ["platforms;android-35"],
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("sends progress notifications on a heartbeat when a progressToken is present", async () => {
    vi.useFakeTimers();
    let resolveExec!: (value: ReturnType<typeof mockSuccessResult>) => void;
    mockedExec.mockReturnValue(
      new Promise((resolve) => {
        resolveExec = resolve;
      }),
    );
    const server = makeServer({ elicitationCapable: false });
    const extra = makeExtra({ _meta: { progressToken: "tok-1" } });

    const promise = sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(extra.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "notifications/progress",
        params: expect.objectContaining({ progressToken: "tok-1" }),
      }),
    );

    resolveExec(mockSuccessResult("installed"));
    await promise;
    vi.useRealTimers();
  });

  it("does not crash with an unhandled rejection when sendNotification rejects (e.g. transport disconnected)", async () => {
    vi.useFakeTimers();
    let resolveExec!: (value: ReturnType<typeof mockSuccessResult>) => void;
    mockedExec.mockReturnValue(
      new Promise((resolve) => {
        resolveExec = resolve;
      }),
    );
    const server = makeServer({ elicitationCapable: false });
    const sendNotification = vi.fn().mockRejectedValue(new Error("Not connected"));
    const extra = makeExtra({ _meta: { progressToken: "tok-1" } });
    (extra as unknown as { sendNotification: typeof sendNotification }).sendNotification =
      sendNotification;

    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const promise = sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

      await vi.advanceTimersByTimeAsync(10_000);
      await Promise.resolve();
      await Promise.resolve();

      expect(sendNotification).toHaveBeenCalled();
      expect(unhandledRejections).toEqual([]);

      resolveExec(mockSuccessResult("installed"));
      await promise;
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
      vi.useRealTimers();
    }
  });

  it("returns an error response when installation fails", async () => {
    mockedExec.mockResolvedValue(mockFailureResult("license not accepted", 1));
    const server = makeServer({ elicitationCapable: false });
    const extra = makeExtra();

    const result = await sdkInstall({ packages: ["platforms;android-35"] }, env, server, extra);

    expect(result.isError).toBe(true);
  });
});
