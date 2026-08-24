import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared vendor chunking", () => {
  it("splits stable third-party groups without forcing a React transitive chunk", () => {
    const source = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
    expect(source).toContain("manualChunks(id)");
    expect(source).toContain('return "ui-vendor"');
    expect(source).toContain('return "query-vendor"');
    expect(source).toContain('return "icon-vendor"');
    expect(source).not.toContain('return "react-vendor"');
  });
});
