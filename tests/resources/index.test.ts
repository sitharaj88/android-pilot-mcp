import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment, mockSuccessResult, mockFailureResult } from "../helpers/fixtures.js";

vi.mock("../../src/executor.js", () => ({
  executeCommand: vi.fn(),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { executeCommand } from "../../src/executor.js";
import { registerResources } from "../../src/resources/index.js";

const mockedExecuteCommand = vi.mocked(executeCommand);

async function connectedClient(): Promise<{ client: Client; server: McpServer }> {
  const env = mockEnvironment();
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerResources(server, env);

  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.server.connect(serverTransport)]);
  return { client, server };
}

describe("registerResources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed device JSON for android://devices", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "List of devices attached\nemulator-5554          device product:sdk_gphone model:Pixel_6 transport_id:1\n\n",
      ),
    );

    const { client } = await connectedClient();
    const result = await client.readResource({ uri: "android://devices" });

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0] as { text: string; mimeType?: string };
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse(content.text) as {
      devices: Array<{ serial: string; state: string }>;
    };
    expect(parsed.devices).toHaveLength(1);
    expect(parsed.devices[0]).toMatchObject({
      serial: "emulator-5554",
      state: "device",
      model: "Pixel_6",
    });
  });

  it("ignores daemon-startup noise and malformed lines for android://devices", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "* daemon not running; starting now at tcp:5037\n* daemon started successfully\n" +
          "List of devices attached\nemulator-5554          device product:sdk_gphone model:Pixel_6 transport_id:1\nsomegarbageline\n\n",
      ),
    );

    const { client } = await connectedClient();
    const result = await client.readResource({ uri: "android://devices" });
    const content = result.contents[0] as { text: string };
    const parsed = JSON.parse(content.text) as { devices: Array<{ serial: string }> };
    expect(parsed.devices).toHaveLength(1);
    expect(parsed.devices[0].serial).toBe("emulator-5554");
  });

  it("reports an empty device list without throwing when adb fails", async () => {
    mockedExecuteCommand.mockResolvedValue(mockFailureResult("adb: no such device", 1));

    const { client } = await connectedClient();
    const result = await client.readResource({ uri: "android://devices" });
    const content = result.contents[0] as { text: string };
    const parsed = JSON.parse(content.text) as { devices: unknown[]; error?: string };
    expect(parsed.devices).toEqual([]);
    expect(parsed.error).toContain("adb: no such device");
  });

  it("returns parsed AVD names for android://avds", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult(
        "Available Android Virtual Devices:\n    Name: Pixel_6_API_34\n  Device: pixel_6 (Google)\n---------\n    Name: Pixel_7_API_35\n",
      ),
    );

    const { client } = await connectedClient();
    const result = await client.readResource({ uri: "android://avds" });
    const content = result.contents[0] as { text: string; mimeType?: string };
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse(content.text) as { avds: string[] };
    expect(parsed.avds).toEqual(["Pixel_6_API_34", "Pixel_7_API_35"]);
  });

  it("reads logcat for a valid device id via the template", async () => {
    mockedExecuteCommand.mockResolvedValue(
      mockSuccessResult("01-01 00:00:00.000 I Sample: hello\n"),
    );

    const { client } = await connectedClient();
    const result = await client.readResource({ uri: "android://logcat/emulator-5554" });
    const content = result.contents[0] as { text: string; mimeType?: string };
    expect(content.mimeType).toBe("text/plain");
    expect(content.text).toContain("hello");
    expect(mockedExecuteCommand).toHaveBeenCalledWith(
      expect.any(String),
      ["-s", "emulator-5554", "logcat", "-d", "-t", "200"],
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("rejects an invalid device id for the logcat template", async () => {
    const { client } = await connectedClient();
    const overlong = "x".repeat(65);
    await expect(client.readResource({ uri: `android://logcat/${overlong}` })).rejects.toThrow();
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });

  it("dumps and cleans up the UI hierarchy for a valid device id", async () => {
    mockedExecuteCommand
      .mockResolvedValueOnce(mockSuccessResult(""))
      .mockResolvedValueOnce(mockSuccessResult("<hierarchy></hierarchy>"))
      .mockResolvedValueOnce(mockSuccessResult(""));

    const { client } = await connectedClient();
    const result = await client.readResource({ uri: "android://uidump/emulator-5554" });
    const content = result.contents[0] as { text: string; mimeType?: string };
    expect(content.mimeType).toBe("text/xml");
    expect(content.text).toContain("<hierarchy>");
    expect(mockedExecuteCommand).toHaveBeenCalledTimes(3);
    const cleanupCall = mockedExecuteCommand.mock.calls[2];
    expect(cleanupCall[1]).toEqual(
      expect.arrayContaining(["shell", "rm", "-f", expect.stringContaining("mcp_uidump_")]),
    );
  });

  it("rejects an invalid device id for the uidump template", async () => {
    const { client } = await connectedClient();
    const overlong = "x".repeat(65);
    await expect(client.readResource({ uri: `android://uidump/${overlong}` })).rejects.toThrow();
    expect(mockedExecuteCommand).not.toHaveBeenCalled();
  });
});
