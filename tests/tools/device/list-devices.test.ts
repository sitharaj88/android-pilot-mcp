import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../../helpers/fixtures.js";

vi.mock("../../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from "../../../src/executor.js";
import { listDevices } from "../../../src/tools/device/list-devices.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

describe("listDevices", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports no devices when none connected", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("List of devices attached\n\n"));

    const result = await listDevices(env);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("No devices");
  });

  it("lists a single connected device", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "List of devices attached\nemulator-5554          device product:sdk_gphone model:Pixel_6 transport_id:1\n\n",
      ),
    );

    const result = await listDevices(env);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("emulator-5554");
  });

  it("lists multiple devices", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "List of devices attached\nemulator-5554          device product:sdk model:Pixel_6 transport_id:1\n192.168.1.5:5555       device product:flame model:Pixel_4 transport_id:2\n\n",
      ),
    );

    const result = await listDevices(env);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("emulator-5554");
    expect(text).toContain("192.168.1.5:5555");
  });

  it("ignores daemon-startup noise lines instead of fabricating a device from them", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "* daemon not running; starting now at tcp:5037\n* daemon started successfully\n" +
          "List of devices attached\nemulator-5554          device product:sdk model:Pixel_6 transport_id:1\n\n",
      ),
    );

    const result = await listDevices(env);

    expect(result.structuredContent).toEqual({
      devices: [{ id: "emulator-5554", state: "device", type: "emulator", model: "Pixel_6" }],
    });
  });

  it("drops a single-token (malformed) line instead of fabricating a device or throwing", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "List of devices attached\nemulator-5554          device product:sdk model:Pixel_6 transport_id:1\nsomegarbageline\n\n",
      ),
    );

    const result = await listDevices(env);

    expect(result.structuredContent).toEqual({
      devices: [{ id: "emulator-5554", state: "device", type: "emulator", model: "Pixel_6" }],
    });
  });

  it("returns error when adb fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("adb: unable to connect", 1));

    const result = await listDevices(env);
    expect(result.isError).toBe(true);
  });

  it("calls adb with correct arguments", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("List of devices attached\n\n"));

    await listDevices(env);

    expect(mockedExecuteCommand).toHaveBeenCalledWith(env.adbPath, ["devices", "-l"], {
      timeout: 10_000,
      signal: undefined,
    });
  });

  it("returns structuredContent matching the devices output schema", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "List of devices attached\nemulator-5554          device product:sdk model:Pixel_6 transport_id:1\n192.168.1.5:5555       device product:flame model:Pixel_4 transport_id:2\n\n",
      ),
    );

    const result = await listDevices(env);

    expect(result.structuredContent).toEqual({
      devices: [
        { id: "emulator-5554", state: "device", type: "emulator", model: "Pixel_6" },
        { id: "192.168.1.5:5555", state: "device", type: "device", model: "Pixel_4" },
      ],
    });
  });

  it("returns an empty devices array in structuredContent when none connected", async () => {
    mockedExecuteCommand.mockResolvedValue(mockSuccessResult("List of devices attached\n\n"));

    const result = await listDevices(env);

    expect(result.structuredContent).toEqual({ devices: [] });
  });

  it("does not set structuredContent on failure", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("adb: unable to connect", 1));

    const result = await listDevices(env);

    expect(result.structuredContent).toBeUndefined();
  });
});
