import { describe, expect, it } from "vitest";

describe("managed Meta App credentials", () => {
  const operationalCheck = process.env.RUN_META_APP_CREDENTIAL_CHECK === "true" ? it : it.skip;

  operationalCheck("are accepted by Meta's lightweight App identity endpoint without exposing credentials", async () => {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    expect(Boolean(appId)).toBe(true);
    expect(Boolean(appSecret)).toBe(true);

    const url = new URL(`https://graph.facebook.com/v24.0/${encodeURIComponent(appId!)}`);
    url.searchParams.set("fields", "id");
    url.searchParams.set("access_token", `${appId}|${appSecret}`);
    const response = await fetch(url);
    const payload = await response.json().catch(() => null) as { id?: string } | null;
    expect(response.ok).toBe(true);
    expect(payload?.id === appId).toBe(true);
  }, 20_000);
});
