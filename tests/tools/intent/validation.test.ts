import { describe, it, expect } from "vitest";
import {
  validateIntentAction,
  validateComponent,
  validateExtras,
  validateFlag,
  validateDeeplinkUri,
  shellQuoteForDevice,
} from "../../../src/tools/intent/validation.js";
import { ValidationError } from "../../../src/utils/validation.js";

describe("validateIntentAction", () => {
  it("accepts standard Android action names", () => {
    expect(validateIntentAction("android.intent.action.VIEW")).toBe("android.intent.action.VIEW");
    expect(validateIntentAction("com.example.MY_ACTION")).toBe("com.example.MY_ACTION");
  });

  it("accepts custom actions containing hyphens", () => {
    expect(validateIntentAction("com.example.MY-ACTION")).toBe("com.example.MY-ACTION");
  });

  it("rejects empty strings", () => {
    expect(() => validateIntentAction("")).toThrow(ValidationError);
  });

  it("rejects whitespace and shell metacharacters", () => {
    expect(() => validateIntentAction("android.intent.action.VIEW; rm -rf /")).toThrow(
      ValidationError,
    );
    expect(() => validateIntentAction("action with space")).toThrow(ValidationError);
    expect(() => validateIntentAction("$(whoami)")).toThrow(ValidationError);
  });

  it("rejects strings that exceed the max length", () => {
    expect(() => validateIntentAction("a".repeat(257))).toThrow(ValidationError);
  });
});

describe("validateComponent", () => {
  it("accepts a package/class component", () => {
    expect(validateComponent("com.example.app/.MainActivity")).toBe(
      "com.example.app/.MainActivity",
    );
    expect(validateComponent("com.example.app/com.example.app.MainActivity")).toBe(
      "com.example.app/com.example.app.MainActivity",
    );
  });

  it("rejects a component missing the slash separator", () => {
    expect(() => validateComponent("com.example.app.MainActivity")).toThrow(ValidationError);
  });

  it("rejects components with shell metacharacters", () => {
    expect(() => validateComponent("com.example/.Main;rm -rf /")).toThrow(ValidationError);
    expect(() => validateComponent("com.example/`whoami`")).toThrow(ValidationError);
  });
});

describe("validateExtras", () => {
  it("accepts well-formed extras", () => {
    const extras = { user_id: "42", session_token: "abc.123" };
    expect(validateExtras(extras)).toBe(extras);
  });

  it("rejects extra keys with invalid characters", () => {
    expect(() => validateExtras({ "bad key": "value" })).toThrow(ValidationError);
    expect(() => validateExtras({ "bad;key": "value" })).toThrow(ValidationError);
  });

  it("accepts extra values containing whitespace or shell metacharacters (neutralized via quoting, not rejection)", () => {
    expect(validateExtras({ key: "has space" })).toEqual({ key: "has space" });
    expect(validateExtras({ key: "value; rm -rf /" })).toEqual({ key: "value; rm -rf /" });
    expect(validateExtras({ key: "$(whoami)" })).toEqual({ key: "$(whoami)" });
    expect(validateExtras({ key: "a`b`c" })).toEqual({ key: "a`b`c" });
    expect(validateExtras({ key: "utm=1&ref=2" })).toEqual({ key: "utm=1&ref=2" });
    expect(validateExtras({ key: "(parenthesized)" })).toEqual({ key: "(parenthesized)" });
  });

  it("rejects extra values containing control characters", () => {
    expect(() => validateExtras({ key: "bad\x00value" })).toThrow(ValidationError);
    expect(() => validateExtras({ key: "bad\nvalue" })).toThrow(ValidationError);
    expect(() => validateExtras({ key: "bad\x7fvalue" })).toThrow(ValidationError);
  });

  it("rejects extra values exceeding the max length", () => {
    expect(() => validateExtras({ key: "a".repeat(257) })).toThrow(ValidationError);
  });
});

describe("validateFlag", () => {
  it("accepts hex and decimal flags", () => {
    expect(validateFlag("0x10000000")).toBe("0x10000000");
    expect(validateFlag("-1")).toBe("-1");
    expect(validateFlag("123")).toBe("123");
  });

  it("rejects non-numeric flags", () => {
    expect(() => validateFlag("FLAG_ACTIVITY_NEW_TASK")).toThrow(ValidationError);
    expect(() => validateFlag("0x10000000; rm -rf /")).toThrow(ValidationError);
  });
});

describe("validateDeeplinkUri", () => {
  it("accepts well-formed URIs", () => {
    expect(validateDeeplinkUri("https://example.com/path?query=1")).toBe(
      "https://example.com/path?query=1",
    );
    expect(validateDeeplinkUri("myapp://profile/123")).toBe("myapp://profile/123");
  });

  it("accepts URIs with query strings, parens, and multiple params (previously wrongly rejected)", () => {
    expect(validateDeeplinkUri("https://example.com/p?a=1&b=2")).toBe(
      "https://example.com/p?a=1&b=2",
    );
    expect(validateDeeplinkUri("myapp://x?utm=1&ref=2")).toBe("myapp://x?utm=1&ref=2");
    expect(validateDeeplinkUri("https://example.com/path(1)")).toBe("https://example.com/path(1)");
    expect(validateDeeplinkUri("https://example.com/`whoami`")).toBe(
      "https://example.com/`whoami`",
    );
    expect(validateDeeplinkUri("https://example.com/ ; rm -rf /")).toBe(
      "https://example.com/ ; rm -rf /",
    );
  });

  it("rejects URIs with control characters", () => {
    expect(() => validateDeeplinkUri("https://example.com/\x00")).toThrow(ValidationError);
    expect(() => validateDeeplinkUri("https://example.com/\npath")).toThrow(ValidationError);
  });

  it("rejects URIs exceeding the max length", () => {
    expect(() => validateDeeplinkUri(`https://example.com/${"a".repeat(2048)}`)).toThrow(
      ValidationError,
    );
  });
});

describe("shellQuoteForDevice", () => {
  it("wraps a plain value in single quotes", () => {
    expect(shellQuoteForDevice("hello")).toBe("'hello'");
  });

  it("preserves spaces and shell metacharacters as a single quoted word", () => {
    expect(shellQuoteForDevice("https://example.com/p?a=1&b=2")).toBe(
      "'https://example.com/p?a=1&b=2'",
    );
    expect(shellQuoteForDevice("has space")).toBe("'has space'");
    expect(shellQuoteForDevice("$(whoami)")).toBe("'$(whoami)'");
  });

  it("escapes embedded single quotes so the value stays one shell word", () => {
    expect(shellQuoteForDevice("it's a test")).toBe("'it'\\''s a test'");
  });
});
