import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Meta OAuth workspace resume UI", () => {
  const source = readFileSync(new URL("../client/src/components/MetaConnectionWizard.tsx", import.meta.url), "utf8");

  it("uses a top-level tab in embedded previews and preserves only the opaque session reference for Page selection recovery", () => {
    expect(source).toContain("window.location.assign(result.authorizationUrl)");
    expect(source).toContain('window.open("about:blank", "_blank")');
    expect(source).toContain("function isEmbeddedPreview()");
    expect(source).toContain("oauthWindow.opener = null");
    expect(source).toContain("oauthWindow.location.assign(result.authorizationUrl)");
    expect(source).toContain("nexareply:pending-meta-oauth-session");
    expect(source).toContain("meta_oauth_session");
    expect(source).not.toContain('window.open(result.authorizationUrl, "nexareply-meta-oauth"');
  });

  it("keeps manual setup behind a server-provided feature flag and avoids token input in the default OAuth path", () => {
    expect(source).toContain("manualSetupEnabled");
    expect(source).toContain("manualSetupEnabled ? (");
    expect(source).toContain("ხელით მიბმის შესახებ");
    expect(source).toContain("საერთო Webhook კონფიგურაციას პლატფორმა მართავს");
    expect(source).toContain("Facebook გვერდის ID");
    expect(source).toContain("Facebook Page Access Token");
    expect(source).not.toContain("Verify Token");
    expect(source).not.toContain("verifyTokenQuery");
    expect(source).not.toContain("Webhook URL");
    expect(source).toContain("ამ გარემოში გამორთულია");
    expect(source).toContain("Facebook-ით ავტორიზაცია");
    expect(source).toContain("disconnect.mutate");
    expect(source).toContain("გათიშვა და ახალი Page-ის მიბმა");
  });
});
