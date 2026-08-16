import { describe, it, expect } from "vitest";
import { z } from "zod";
import { screenRecordInputSchema } from "../../../src/tools/debug/schemas.js";

describe("screenRecordInputSchema", () => {
  const schema = z.object(screenRecordInputSchema);

  it("accepts a duration within the 1-180 second range", () => {
    const result = schema.safeParse({ duration: 30, savePath: "/tmp/rec.mp4" });
    expect(result.success).toBe(true);
  });

  it("rejects a duration above the 180 second maximum", () => {
    const result = schema.safeParse({ duration: 181, savePath: "/tmp/rec.mp4" });
    expect(result.success).toBe(false);
  });

  it("rejects a duration below the 1 second minimum", () => {
    const result = schema.safeParse({ duration: 0, savePath: "/tmp/rec.mp4" });
    expect(result.success).toBe(false);
  });

  it("defaults duration to 10 seconds when omitted", () => {
    const result = schema.safeParse({ savePath: "/tmp/rec.mp4" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.duration).toBe(10);
    }
  });
});
