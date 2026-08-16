import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockEnvironment } from "../../helpers/fixtures.js";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));
vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
}));

import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { deviceScreenshot } from "../../../src/tools/debug/screenshot.js";

const mockedExecFile = vi.mocked(execFile);
const mockedWriteFileSync = vi.mocked(writeFileSync);

function queuePngBuffer(buffer: Buffer): void {
  mockedExecFile.mockImplementationOnce(((..._args: unknown[]) => {
    const cb = _args[_args.length - 1] as (err: unknown, stdout: Buffer) => void;
    cb(null, buffer);
    return {} as never;
  }) as unknown as typeof execFile);
}

describe("deviceScreenshot", () => {
  const env = mockEnvironment();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns base64 image data on success", async () => {
    queuePngBuffer(Buffer.from("fake-png-bytes"));

    const result = await deviceScreenshot({}, env);
    const imagePart = result.content.find((c) => c.type === "image") as {
      type: "image";
      data: string;
      mimeType: string;
    };
    expect(imagePart).toBeDefined();
    expect(imagePart.mimeType).toBe("image/png");
    expect(mockedWriteFileSync).not.toHaveBeenCalled();
  });

  it("saves to disk when savePath is provided", async () => {
    queuePngBuffer(Buffer.from("fake-png-bytes"));

    await deviceScreenshot({ savePath: "/tmp/shot.png" }, env);

    expect(mockedWriteFileSync).toHaveBeenCalledWith("/tmp/shot.png", expect.any(Buffer));
  });

  it("rejects a relative savePath", async () => {
    await expect(deviceScreenshot({ savePath: "shot.png" }, env)).rejects.toThrow(/absolute path/);
    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it("rejects an invalid device id", async () => {
    await expect(deviceScreenshot({ deviceId: "bad id!" }, env)).rejects.toThrow(
      /Invalid device ID/,
    );
    expect(mockedExecFile).not.toHaveBeenCalled();
  });
});
