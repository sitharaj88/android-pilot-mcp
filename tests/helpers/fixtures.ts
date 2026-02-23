import type { Environment, ExecResult } from "../../src/types.js";

export function mockEnvironment(overrides: Partial<Environment> = {}): Environment {
  return {
    androidHome: "/opt/android-sdk",
    adbPath: "/opt/android-sdk/platform-tools/adb",
    emulatorPath: "/opt/android-sdk/emulator/emulator",
    avdmanagerPath: "/opt/android-sdk/cmdline-tools/latest/bin/avdmanager",
    sdkmanagerPath: "/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager",
    javaHome: "/usr/lib/jvm/java-17",
    ...overrides,
  };
}

export function mockExecResult(overrides: Partial<ExecResult> = {}): ExecResult {
  return {
    success: true,
    stdout: "",
    stderr: "",
    exitCode: 0,
    timedOut: false,
    ...overrides,
  };
}

export function mockSuccessResult(stdout: string): ExecResult {
  return mockExecResult({ success: true, stdout, exitCode: 0 });
}

export function mockFailureResult(stderr: string, exitCode: number = 1): ExecResult {
  return mockExecResult({ success: false, stderr, exitCode });
}

export function mockTimeoutResult(): ExecResult {
  return mockExecResult({
    success: false,
    stderr: "Command timed out",
    exitCode: null,
    timedOut: true,
  });
}
