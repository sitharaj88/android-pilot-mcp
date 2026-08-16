import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { deviceInfo } from "../../../src/tools/debug/device-info.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

const GETPROP_VALUES = [
  "Pixel 7", // ro.product.model
  "Google", // ro.product.manufacturer
  "14", // ro.build.version.release
  "34", // ro.build.version.sdk
  "arm64-v8a", // ro.product.cpu.abi
  "420", // ro.sf.lcd_density
  "UP1A.230505.005", // ro.build.display.id
  "userdebug", // ro.build.type
  "cheetah", // ro.hardware
  "268435456", // dalvik.vm.heapsize
];

function queueDefaultResponses(): void {
  for (const value of GETPROP_VALUES) {
    mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult(`${value}\n`));
  }
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("level: 87\nscale: 100\n"));
  mockedExecuteCommand.mockResolvedValueOnce(mockSuccessResult("Physical size: 1080x2400\n"));
}

describe("deviceInfo", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured device info matching the gathered data", async () => {
    queueDefaultResponses();

    const result = await deviceInfo({}, env);

    expect(result.structuredContent).toEqual({
      model: "Pixel 7",
      manufacturer: "Google",
      androidVersion: "14",
      sdkLevel: 34,
      cpuAbi: "arm64-v8a",
      screenDensity: "420",
      buildId: "UP1A.230505.005",
      buildType: "userdebug",
      hardware: "cheetah",
      heapSize: "268435456",
      batteryLevel: 87,
      screenResolution: "1080x2400",
    });

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Model: Pixel 7");
    expect(text).toContain("Battery Level: 87%");
    expect(text).toContain("Screen Resolution: 1080x2400");
  });

  it("falls back to null fields when getprop calls fail", async () => {
    for (let i = 0; i < GETPROP_VALUES.length; i++) {
      mockedExecuteCommand.mockResolvedValueOnce(mockFailureResult("no device", 1));
    }
    mockedExecuteCommand.mockResolvedValueOnce(mockFailureResult("no device", 1));
    mockedExecuteCommand.mockResolvedValueOnce(mockFailureResult("no device", 1));

    const result = await deviceInfo({}, env);

    expect(result.structuredContent).toEqual({
      model: null,
      manufacturer: null,
      androidVersion: null,
      sdkLevel: null,
      cpuAbi: null,
      screenDensity: null,
      buildId: null,
      buildType: null,
      hardware: null,
      heapSize: null,
      batteryLevel: null,
      screenResolution: null,
    });
  });

  it("passes device ID to every adb invocation", async () => {
    queueDefaultResponses();

    await deviceInfo({ deviceId: "emulator-5554" }, env);

    for (const call of mockedExecuteCommand.mock.calls) {
      expect(call[1]).toEqual(expect.arrayContaining(["-s", "emulator-5554"]));
    }
  });

  it("rejects an invalid device id", async () => {
    await expect(deviceInfo({ deviceId: "bad id!" }, env)).rejects.toThrow(/Invalid device ID/);
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });
});
