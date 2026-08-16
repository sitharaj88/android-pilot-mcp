import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, setMcpServer } from "../../src/utils/logger.js";

function makeMockServer(sendLoggingMessage: ReturnType<typeof vi.fn>) {
  return { server: { sendLoggingMessage } } as unknown as Parameters<typeof setMcpServer>[0];
}

describe("logger MCP integration", () => {
  const originalWrite = process.stderr.write;

  beforeEach(() => {
    logger.setLevel("debug");
    process.stderr.write = vi.fn() as unknown as typeof process.stderr.write;
  });

  afterEach(() => {
    logger.setLevel("info");
    setMcpServer(undefined);
    process.stderr.write = originalWrite;
  });

  it("does not throw when no MCP server has been registered", () => {
    expect(() => logger.info("hello")).not.toThrow();
  });

  it("forwards log calls to the MCP server with mapped levels and merged data", () => {
    const sendLoggingMessage = vi.fn().mockResolvedValue(undefined);
    setMcpServer(makeMockServer(sendLoggingMessage));

    logger.warn("careful", { code: 42 });

    expect(sendLoggingMessage).toHaveBeenCalledWith({
      level: "warning",
      data: { message: "careful", code: 42 },
    });
  });

  it("maps debug/info/error levels through unchanged", () => {
    const sendLoggingMessage = vi.fn().mockResolvedValue(undefined);
    setMcpServer(makeMockServer(sendLoggingMessage));

    logger.debug("d");
    logger.info("i");
    logger.error("e");

    expect(sendLoggingMessage).toHaveBeenNthCalledWith(1, {
      level: "debug",
      data: { message: "d" },
    });
    expect(sendLoggingMessage).toHaveBeenNthCalledWith(2, {
      level: "info",
      data: { message: "i" },
    });
    expect(sendLoggingMessage).toHaveBeenNthCalledWith(3, {
      level: "error",
      data: { message: "e" },
    });
  });

  it("swallows synchronous errors thrown by sendLoggingMessage", () => {
    const sendLoggingMessage = vi.fn(() => {
      throw new Error("boom");
    });
    setMcpServer(makeMockServer(sendLoggingMessage));

    expect(() => logger.info("still works")).not.toThrow();
  });

  it("swallows rejected promises from sendLoggingMessage", async () => {
    const sendLoggingMessage = vi.fn().mockRejectedValue(new Error("network error"));
    setMcpServer(makeMockServer(sendLoggingMessage));

    expect(() => logger.info("still works")).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("does not forward logs below the configured level", () => {
    const sendLoggingMessage = vi.fn().mockResolvedValue(undefined);
    setMcpServer(makeMockServer(sendLoggingMessage));
    logger.setLevel("error");

    logger.info("quiet");

    expect(sendLoggingMessage).not.toHaveBeenCalled();
  });

  it("stops forwarding once the MCP server is cleared", () => {
    const sendLoggingMessage = vi.fn().mockResolvedValue(undefined);
    setMcpServer(makeMockServer(sendLoggingMessage));
    setMcpServer(undefined);

    logger.info("nobody listening");

    expect(sendLoggingMessage).not.toHaveBeenCalled();
  });
});
