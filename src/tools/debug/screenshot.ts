import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { Environment } from "../../types.js";
import { validateAbsolutePath } from "../../utils/validation.js";
import { imageResponse, errorResponse } from "../../utils/response.js";

interface ScreenshotArgs {
  deviceId?: string;
  savePath?: string;
}

export async function deviceScreenshot(args: ScreenshotArgs, env: Environment) {
  if (args.savePath) {
    validateAbsolutePath(args.savePath, "Save path");
  }

  const adbArgs: string[] = [];
  if (args.deviceId) adbArgs.push("-s", args.deviceId);
  adbArgs.push("exec-out", "screencap", "-p");

  try {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const _proc = execFile(
        env.adbPath,
        adbArgs,
        { encoding: "buffer" as unknown as "utf-8", maxBuffer: 20 * 1024 * 1024, timeout: 15_000 },
        (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout as unknown as Buffer);
        },
      );
    });

    if (buffer.length === 0) {
      return errorResponse("Screenshot failed. Device may be locked or not fully booted.");
    }

    if (args.savePath) {
      writeFileSync(args.savePath, buffer);
    }

    const base64 = buffer.toString("base64");

    return imageResponse(
      base64,
      "image/png",
      args.savePath ? `Screenshot saved to: ${args.savePath}` : undefined,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Screenshot failed: ${message}`);
  }
}
