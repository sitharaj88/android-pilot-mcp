import { describe, it, expect } from "vitest";
import {
  textResponse,
  errorResponse,
  imageResponse,
  execResultResponse,
  truncateOutput,
  withErrorHandling,
  structuredResponse,
} from "../../src/utils/response.js";
import { ValidationError } from "../../src/utils/validation.js";
import { mockSuccessResult, mockFailureResult, mockTimeoutResult } from "../helpers/fixtures.js";

describe("textResponse", () => {
  it("returns a text content response", () => {
    const result = textResponse("hello");
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });

  it("does not include isError", () => {
    const result = textResponse("hello");
    expect(result.isError).toBeUndefined();
  });
});

describe("errorResponse", () => {
  it("returns a text content response with isError true", () => {
    const result = errorResponse("fail");
    expect(result).toEqual({
      content: [{ type: "text", text: "fail" }],
      isError: true,
    });
  });
});

describe("imageResponse", () => {
  it("returns an image content response with default mimeType", () => {
    const result = imageResponse("base64data");
    expect(result).toEqual({
      content: [{ type: "image", data: "base64data", mimeType: "image/png" }],
    });
  });

  it("uses custom mimeType", () => {
    const result = imageResponse("data", "image/jpeg");
    expect(result.content[0]).toEqual({
      type: "image",
      data: "data",
      mimeType: "image/jpeg",
    });
  });

  it("includes additional text when provided", () => {
    const result = imageResponse("data", "image/png", "Screenshot saved");
    expect(result.content).toHaveLength(2);
    expect(result.content[1]).toEqual({
      type: "text",
      text: "Screenshot saved",
    });
  });
});

describe("execResultResponse", () => {
  it("formats successful result", () => {
    const result = execResultResponse(mockSuccessResult("BUILD OK"), {
      successPrefix: "Build succeeded",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toHaveProperty("type", "text");
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Build succeeded");
    expect(text).toContain("BUILD OK");
  });

  it("formats failed result with exit code", () => {
    const result = execResultResponse(mockFailureResult("compile error", 2), {
      failurePrefix: "Build failed",
    });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Build failed");
    expect(text).toContain("exit code: 2");
    expect(text).toContain("compile error");
  });

  it("formats timed out result", () => {
    const result = execResultResponse(mockTimeoutResult());
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("[TIMED OUT]");
  });

  it("truncates output when maxOutputBytes is set", () => {
    const longOutput = "x".repeat(1000);
    const result = execResultResponse(mockSuccessResult(longOutput), {
      maxOutputBytes: 100,
    });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("[Output truncated");
  });

  it("includes stderr on success when requested", () => {
    const execResult = { ...mockSuccessResult("out"), stderr: "warning" };
    const result = execResultResponse(execResult, {
      includeStderrOnSuccess: true,
    });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("STDERR:");
    expect(text).toContain("warning");
  });
});

describe("truncateOutput", () => {
  it("returns original text when under limit", () => {
    const { text, truncated } = truncateOutput("short", 1000);
    expect(text).toBe("short");
    expect(truncated).toBe(false);
  });

  it("truncates text over limit", () => {
    const { text, truncated } = truncateOutput("long text here", 4);
    expect(text).toBe("long");
    expect(truncated).toBe(true);
  });

  it("is a no-op when byte length equals the limit exactly", () => {
    const { text, truncated } = truncateOutput("abcd", 4);
    expect(text).toBe("abcd");
    expect(truncated).toBe(false);
  });

  it("does not split a multi-byte UTF-8 character", () => {
    // "é" is 2 bytes in UTF-8 (0xC3 0xA9); cutting at byte 2 would split it.
    const { text, truncated } = truncateOutput("héllo", 2);
    expect(truncated).toBe(true);
    expect(text).toBe("h");
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(2);
  });

  it("counts multi-byte characters by byte length, not string length", () => {
    // Each "é" is 2 bytes, so "éé" is 4 bytes but only 2 chars.
    const { text, truncated } = truncateOutput("éé", 4);
    expect(text).toBe("éé");
    expect(truncated).toBe(false);
  });

  it("truncates emoji (surrogate pair / multi-byte) text without leaving replacement characters", () => {
    const { text } = truncateOutput("🎉🎉🎉", 5);
    expect(text.includes("�")).toBe(false);
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(5);
  });
});

describe("structuredResponse", () => {
  it("returns text content plus structuredContent", () => {
    const result = structuredResponse("summary text", { count: 3, ok: true });
    expect(result.content).toEqual([{ type: "text", text: "summary text" }]);
    expect(result.structuredContent).toEqual({ count: 3, ok: true });
    expect(result.isError).toBeUndefined();
  });
});

describe("withErrorHandling", () => {
  it("returns handler result on success", async () => {
    const handler = async () => textResponse("ok");
    const wrapped = withErrorHandling(handler);
    const result = await wrapped({});
    expect(result).toEqual(textResponse("ok"));
  });

  it("catches ValidationError and returns error response", async () => {
    const handler = async () => {
      throw new ValidationError("bad input");
    };
    const wrapped = withErrorHandling(handler);
    const result = await wrapped({});
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toBe("bad input");
  });

  it("catches unexpected errors and returns internal error", async () => {
    const handler = async () => {
      throw new Error("something broke");
    };
    const wrapped = withErrorHandling(handler);
    const result = await wrapped({});
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Internal error");
    expect(text).toContain("something broke");
  });
});
