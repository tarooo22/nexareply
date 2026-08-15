import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Meta OAuth workspace resume UI", () => {
  const source = readFileSync(new URL("../client/src/components/MetaConnectionWizard.tsx", import.meta.url), "utf8");

  it("uses a full-page authorization redirect and preserves only the opaque session reference for Page selection recovery", () => {
    expect(source).toContain("window.location.assign(result.authorizationUrl)");
    expect(source).toContain("nexareply:pending-meta-oauth-session");
    expect(source).toContain("meta_oauth_session");
    expect(source).not.toContain('window.open(result.authorizationUrl, "nexareply-meta-oauth"');
  });
});
