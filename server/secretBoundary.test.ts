import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("secret boundary", () => {
  it("does not place provider secret identifiers in client-side sources", () => {
    const clientRoot = join(process.cwd(), "client", "src");
    const publicShell = readFileSync(join(clientRoot, "pages", "DemoWorkspace.tsx"), "utf8");
    const protectedShell = readFileSync(join(clientRoot, "pages", "AuthenticatedWorkspace.tsx"), "utf8");
    const exposed = `${publicShell}\n${protectedShell}`;
    expect(exposed).not.toMatch(/OPENAI_API_KEY|META_APP_SECRET|TELEGRAM_BOT_TOKEN|DATABASE_URL/);
  });
});
