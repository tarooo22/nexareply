import { describe, expect, it } from "vitest";

describe("managed Meta Page access token", () => {
  const operationalCheck = process.env.RUN_META_PAGE_TOKEN_CHECK === "true" ? it : it.skip;

  operationalCheck("is accepted by the selected Page subscription endpoint without exposing the token", async () => {
    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
    const pageId = process.env.META_PAGE_ID;
    expect(Boolean(pageAccessToken)).toBe(true);
    expect(Boolean(pageId)).toBe(true);
    const url = new URL(`https://graph.facebook.com/v24.0/${encodeURIComponent(pageId!)}/subscribed_apps`);
    url.searchParams.set("fields", "id");
    url.searchParams.set("access_token", pageAccessToken!);
    const response = await fetch(url);
    const payload = await response.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
    expect(response.ok).toBe(true);
    expect(Array.isArray(payload?.data)).toBe(true);
  }, 20_000);
});
