import { describe, it, expect } from "vitest";
import {
  validateAbsolutePath,
  validatePackageName,
  validateSafeName,
  validateSdkPackage,
  validateShellCommand,
  ValidationError,
} from "../../src/utils/validation.js";

describe("validateAbsolutePath", () => {
  it("accepts valid absolute paths", () => {
    expect(validateAbsolutePath("/home/user/project")).toBe("/home/user/project");
    expect(validateAbsolutePath("/tmp/test")).toBe("/tmp/test");
  });

  it("rejects relative paths", () => {
    expect(() => validateAbsolutePath("relative/path")).toThrow(ValidationError);
    expect(() => validateAbsolutePath("./local")).toThrow(ValidationError);
  });

  it("rejects empty strings", () => {
    expect(() => validateAbsolutePath("")).toThrow(ValidationError);
  });

  it("rejects paths with null bytes", () => {
    expect(() => validateAbsolutePath("/home/user\0/evil")).toThrow(ValidationError);
  });

  it("uses custom label in error messages", () => {
    try {
      validateAbsolutePath("relative", "Project directory");
    } catch (e) {
      expect((e as Error).message).toContain("Project directory");
    }
  });
});

describe("validatePackageName", () => {
  it("accepts valid package names", () => {
    expect(validatePackageName("com.example.myapp")).toBe("com.example.myapp");
    expect(validatePackageName("com.example")).toBe("com.example");
    expect(validatePackageName("org.test.App123")).toBe("org.test.App123");
    expect(validatePackageName("com.my_app.test")).toBe("com.my_app.test");
  });

  it("rejects single-segment names", () => {
    expect(() => validatePackageName("example")).toThrow(ValidationError);
  });

  it("rejects names starting with numbers", () => {
    expect(() => validatePackageName("1com.example")).toThrow(ValidationError);
    expect(() => validatePackageName("com.1example")).toThrow(ValidationError);
  });

  it("rejects empty strings", () => {
    expect(() => validatePackageName("")).toThrow(ValidationError);
  });

  it("rejects names with invalid characters", () => {
    expect(() => validatePackageName("com.exam-ple")).toThrow(ValidationError);
    expect(() => validatePackageName("com.exam ple")).toThrow(ValidationError);
  });

  it("rejects names exceeding 255 characters", () => {
    const longName = "com." + "a".repeat(252);
    expect(() => validatePackageName(longName)).toThrow(ValidationError);
  });
});

describe("validateSafeName", () => {
  it("accepts valid names", () => {
    expect(validateSafeName("MyAvd")).toBe("MyAvd");
    expect(validateSafeName("test-avd")).toBe("test-avd");
    expect(validateSafeName("avd_123")).toBe("avd_123");
  });

  it("rejects empty strings", () => {
    expect(() => validateSafeName("")).toThrow(ValidationError);
  });

  it("rejects names starting with numbers", () => {
    expect(() => validateSafeName("123abc")).toThrow(ValidationError);
  });

  it("rejects names with special characters", () => {
    expect(() => validateSafeName("my;avd")).toThrow(ValidationError);
    expect(() => validateSafeName("my avd")).toThrow(ValidationError);
    expect(() => validateSafeName("my$avd")).toThrow(ValidationError);
  });

  it("rejects names exceeding 128 characters", () => {
    const longName = "a".repeat(129);
    expect(() => validateSafeName(longName)).toThrow(ValidationError);
  });

  it("uses custom label in error messages", () => {
    try {
      validateSafeName("bad;name", "AVD name");
    } catch (e) {
      expect((e as Error).message).toContain("AVD name");
    }
  });
});

describe("validateSdkPackage", () => {
  it("accepts valid SDK package names", () => {
    expect(validateSdkPackage("system-images;android-35;google_apis;arm64-v8a")).toBe(
      "system-images;android-35;google_apis;arm64-v8a",
    );
    expect(validateSdkPackage("platforms;android-35")).toBe("platforms;android-35");
    expect(validateSdkPackage("build-tools;35.0.0")).toBe("build-tools;35.0.0");
  });

  it("rejects empty strings", () => {
    expect(() => validateSdkPackage("")).toThrow(ValidationError);
  });

  it("rejects packages with invalid characters", () => {
    expect(() => validateSdkPackage("pkg name")).toThrow(ValidationError);
    expect(() => validateSdkPackage("pkg$name")).toThrow(ValidationError);
  });
});

describe("validateShellCommand", () => {
  it("accepts valid commands", () => {
    expect(validateShellCommand("ls -la")).toBe("ls -la");
    expect(validateShellCommand("pm list packages")).toBe("pm list packages");
  });

  it("rejects empty strings", () => {
    expect(() => validateShellCommand("")).toThrow(ValidationError);
  });

  it("rejects commands with null bytes", () => {
    expect(() => validateShellCommand("ls\0-la")).toThrow(ValidationError);
  });

  it("rejects commands exceeding max length", () => {
    const longCmd = "x".repeat(4097);
    expect(() => validateShellCommand(longCmd)).toThrow(ValidationError);
  });
});
