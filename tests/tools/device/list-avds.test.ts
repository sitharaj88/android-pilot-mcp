import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { listAvds } from "../../../src/tools/device/list-avds.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

const SAMPLE_OUTPUT = `Available Android Virtual Devices:
    Name: Pixel_6_API_34
  Device: pixel_6 (Google)
    Path: /home/user/.android/avd/Pixel_6_API_34.avd
  Target: Google APIs (Google Inc.)
          Based on: Android 14.0 (UpsideDownCake) Tag/ABI: google_apis_playstore/arm64-v8a
    Sdcard: 512 MB
---------
    Name: Pixel_4_API_30
  Device: pixel_4 (Google)
    Path: /home/user/.android/avd/Pixel_4_API_30.avd
  Target: Google APIs (Google Inc.)
          Based on: Android 11.0 (R) Tag/ABI: google_apis/x86_64
`;

describe("listAvds", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structuredContent with parsed avd entries", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult(SAMPLE_OUTPUT));

    const result = await listAvds(env);

    expect(result.structuredContent).toEqual({
      avds: [
        {
          name: "Pixel_6_API_34",
          device: "pixel_6",
          path: "/home/user/.android/avd/Pixel_6_API_34.avd",
          target: "Google APIs (Google Inc.)",
        },
        {
          name: "Pixel_4_API_30",
          device: "pixel_4",
          path: "/home/user/.android/avd/Pixel_4_API_30.avd",
          target: "Google APIs (Google Inc.)",
        },
      ],
    });
  });

  it("reports no AVDs found when the list is empty", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult("Available Android Virtual Devices:\n"),
    );

    const result = await listAvds(env);
    expect(result.structuredContent).toEqual({ avds: [] });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("No AVDs found");
  });

  it("returns an error response when avdmanager fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("command not found", 127));

    const result = await listAvds(env);
    expect(result.isError).toBe(true);
  });
});
