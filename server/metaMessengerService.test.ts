import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metaMessengerService } from "./metaMessengerService";
import { sealMetaPageToken } from "./metaTokenVault";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const scope: WorkspaceScope = { organizationId: 7, role: "owner", isDemo: false, actorUserId: 9 };
const metaEnvKeys = ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "META_PAGE_ACCESS_TOKEN", "META_OAUTH_REDIRECT_URI", "META_TOKEN_ENCRYPTION_KEY", "META_LOGIN_CONFIG_ID", "ENABLE_META_MANUAL_SETUP"] as const;
const originalEnv = Object.fromEntries(metaEnvKeys.map((key) => [key, process.env[key]]));

function ownerContext(): TrpcContext {
  return {
    user: { id: 9, openId: "owner-user", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function configureMeta() {
  process.env.META_APP_ID = "app-id";
  process.env.META_APP_SECRET = "app-secret";
  process.env.META_VERIFY_TOKEN = "verify-token";
  process.env.META_PAGE_ACCESS_TOKEN = "page-access-token-for-tests";
  process.env.META_OAUTH_REDIRECT_URI = "https://example.test/api/integrations/meta/callback";
  process.env.META_TOKEN_ENCRYPTION_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY";
}

function signedMetaRequest(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", "app-secret").update(encodedPayload).digest("base64url");
  return `${signature}.${encodedPayload}`;
}

beforeEach(() => {
  configureMeta();
  vi.spyOn(nexareplyRepository, "consumeRateLimit").mockResolvedValue({ allowed: true, hits: 1, remaining: 119, windowStartsAt: new Date() });
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const key of metaEnvKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Meta Messenger managed configuration and webhook security", () => {
  it("stays disabled until every managed server setting exists", () => {
    delete process.env.META_APP_SECRET;
    expect(metaMessengerService.isConfigured()).toBe(false);
    expect(metaMessengerService.createOAuthStart(scope)).toMatchObject({ configured: false, authorizationUrl: null, sessionId: null });
  });

  it("uses the managed redirect URI verbatim in the Meta authorization URL", () => {
    const start = metaMessengerService.createOAuthStart(scope);

    expect(start.configured).toBe(true);
    expect(new URL(start.authorizationUrl!).searchParams.get("redirect_uri")).toBe(process.env.META_OAUTH_REDIRECT_URI);
    expect(new URL(start.authorizationUrl!).pathname).toBe("/v24.0/dialog/oauth");
  });

  it("keeps self-service Meta onboarding available when the optional pilot token is missing", async () => {
    delete process.env.META_PAGE_ACCESS_TOKEN;
    vi.spyOn(nexareplyRepository, "getMetaConnection").mockResolvedValue(undefined);

    const response = await metaMessengerService.getConnectionStatus(scope);

    expect(response).toMatchObject({
      configured: true,
      readiness: { appCredentials: true, webhookChallenge: true, pageDelivery: false, oauthRedirect: true },
    });
    expect(JSON.stringify(response)).not.toMatch(/app-secret|verify-token|page-access-token|accessToken|encrypted/i);
  });

  it("verifies a manually supplied Page credential and persists only tenant-scoped ciphertext", async () => {
    process.env.ENABLE_META_MANUAL_SETUP = "true";
    const vault = vi.spyOn(nexareplyRepository, "upsertMetaTokenVault").mockResolvedValue(undefined);
    const connection = vi.spyOn(nexareplyRepository, "upsertMetaConnection").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "123456789", name: "Merchant Page" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }));

    const response = await metaMessengerService.connectManualPage(scope, {
      pageId: "123456789",
      pageAccessToken: "manual-page-token-must-never-leak-to-the-browser-response",
    });

    expect(response).toEqual({ configured: true, status: "connected", page: { id: "123456789", name: "Merchant Page" } });
    expect(vault).toHaveBeenCalledWith(scope, expect.objectContaining({
      pageId: "123456789",
      encryptedPageToken: expect.not.stringContaining("manual-page-token-must-never-leak-to-the-browser-response"),
    }));
    expect(connection).toHaveBeenCalledWith(scope, expect.objectContaining({ pageId: "123456789", pageName: "Merchant Page", credentialMode: "tenant_vault" }));
    expect(JSON.stringify(response)).not.toContain("manual-page-token-must-never-leak-to-the-browser-response");
  });

  it("validates the webhook challenge and X-Hub-Signature-256 over the raw request body", () => {
    const rawBody = Buffer.from('{"object":"page","entry":[]}');
    const signature = `sha256=${crypto.createHmac("sha256", process.env.META_APP_SECRET!).update(rawBody).digest("hex")}`;
    expect(metaMessengerService.verifyWebhookChallenge({ "hub.mode": "subscribe", "hub.verify_token": "verify-token", "hub.challenge": "challenge-accepted" })).toBe("challenge-accepted");
    expect(metaMessengerService.verifyWebhookChallenge({ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "challenge-accepted" })).toBeNull();
    expect(metaMessengerService.verifyWebhookSignature(rawBody, signature)).toBe(true);
    expect(metaMessengerService.verifyWebhookSignature(rawBody, "sha256=bad")).toBe(false);
  });

  it("accepts the webhook GET challenge with only the managed verify token before OAuth/Page configuration exists", () => {
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.META_PAGE_ACCESS_TOKEN;
    delete process.env.META_OAUTH_REDIRECT_URI;
    expect(metaMessengerService.verifyWebhookChallenge({ "hub.mode": "subscribe", "hub.verify_token": "verify-token", "hub.challenge": "challenge-only" })).toBe("challenge-only");
  });

  it("suppresses repeated inbound Meta events before mutating a conversation or scheduling work", async () => {
    vi.spyOn(nexareplyRepository, "getMetaConnectionByPageId").mockResolvedValue({ organizationId: 7, status: "connected" } as never);
    const createEvent = vi.spyOn(nexareplyRepository, "createMetaWebhookEventOnce")
      .mockResolvedValueOnce({ event: { id: 101 }, created: true } as never)
      .mockResolvedValueOnce({ event: { id: 101 }, created: false } as never);
    vi.spyOn(nexareplyRepository, "getOrCreateMetaConversation").mockResolvedValue({ id: 55 } as never);
    const addMessage = vi.spyOn(nexareplyRepository, "addMessage").mockResolvedValue(undefined);
    const schedule = vi.spyOn(nexareplyRepository, "scheduleConversationProcessing").mockResolvedValue(1);
    vi.spyOn(nexareplyRepository, "getOrganization").mockResolvedValue({ debounceSeconds: 10 } as never);
    vi.spyOn(nexareplyRepository, "updateMetaConnectionStatus").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "setMetaWebhookEventStatus").mockResolvedValue(undefined);

    const payload = { object: "page", entry: [{ id: "page-1", messaging: [{ sender: { id: "psid-1" }, recipient: { id: "page-1" }, timestamp: 1, message: { mid: "mid-1", text: "გამარჯობა" } }] }] };
    await expect(metaMessengerService.handleWebhookPayload(payload)).resolves.toMatchObject({ accepted: true, processed: 1, duplicates: 0 });
    await expect(metaMessengerService.handleWebhookPayload(payload)).resolves.toMatchObject({ accepted: true, processed: 0, duplicates: 1 });
    expect(createEvent).toHaveBeenCalledTimes(2);
    expect(addMessage).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid OAuth state and never returns token-shaped Page candidate fields", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSessionByStateHash").mockResolvedValue(undefined);
    await expect(metaMessengerService.handleOAuthCallback({ state: "invalid-state", code: "authorization-code" })).resolves.toMatchObject({ ok: false });

    vi.spyOn(nexareplyRepository, "getMetaOauthSession").mockResolvedValue({
      id: "session-1",
      status: "pages_ready",
      expiresAt: new Date(Date.now() + 60_000),
      pageCandidates: [{ id: "page-1", name: "TechZone", accessToken: "must-not-leak" }],
    } as never);
    const response = await metaMessengerService.getOAuthPages(scope, "session-1");
    expect(response).toEqual({ configured: true, status: "pages_ready", pages: [{ id: "page-1", name: "TechZone" }] });
    expect(JSON.stringify(response)).not.toMatch(/accessToken|must-not-leak|secret|encrypted/i);
  });

  it("returns only the durable session reference after a cancelled callback so the owner workspace can resume safely", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSessionByStateHash").mockResolvedValue({ id: "owner-session-1", status: "pending", expiresAt: new Date(Date.now() + 60_000) } as never);
    const failSession = vi.spyOn(nexareplyRepository, "failMetaOauthSession").mockResolvedValue(undefined);

    await expect(metaMessengerService.handleOAuthCallback({ state: "known-state", error: "access_denied" })).resolves.toEqual({
      ok: false,
      message: "Meta authorization was cancelled or denied.",
      sessionId: "owner-session-1",
    });
    expect(failSession).toHaveBeenCalledWith("owner-session-1", "Authorization was cancelled or denied.");
  });

  it("keeps a Page returned to a Full-control owner when optional task and Page-token fields are omitted", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSessionByStateHash").mockResolvedValue({ id: "owner-session-2", status: "pending", expiresAt: new Date(Date.now() + 60_000) } as never);
    const savePages = vi.spyOn(nexareplyRepository, "setMetaOauthPages").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "short-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "long-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "page-1", name: "Amadeo" }] }) }));

    await expect(metaMessengerService.handleOAuthCallback({ state: "known-state", code: "authorization-code" })).resolves.toEqual({
      ok: true,
      message: "Pages are ready for selection.",
      sessionId: "owner-session-2",
    });
    expect(savePages).toHaveBeenCalledWith("owner-session-2", [{ id: "page-1", name: "Amadeo" }]);
  });

  it("stages an OAuth Page credential as organization-scoped ciphertext and never returns its plaintext", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSessionByStateHash").mockResolvedValue({ id: "vault-session", organizationId: 7, userId: 9, status: "pending", expiresAt: new Date(Date.now() + 60_000) } as never);
    const stage = vi.spyOn(nexareplyRepository, "stageMetaOauthPageTokens").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "setMetaOauthPages").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "short-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "long-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "page-vault", name: "Vault Page", access_token: "plaintext-page-token" }, { id: "page-metadata", name: "Metadata Only" }] }) }));

    const response = await metaMessengerService.handleOAuthCallback({ state: "vault-state", code: "authorization-code" });

    expect(response).toEqual({ ok: true, message: "Pages are ready for selection.", sessionId: "vault-session" });
    expect(JSON.stringify(response)).not.toContain("plaintext-page-token");
    expect(stage).toHaveBeenCalledWith(
      { organizationId: 7, role: "owner", isDemo: false, actorUserId: 9 },
      "vault-session",
      [expect.objectContaining({ pageId: "page-vault", encryptedPageToken: expect.not.stringContaining("plaintext-page-token") })],
    );
  });

  it("uses the temporary Facebook Login for Business token path when a client-business Page list is initially empty", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSessionByStateHash").mockResolvedValue({ id: "owner-session-3", status: "pending", expiresAt: new Date(Date.now() + 60_000) } as never);
    const savePages = vi.spyOn(nexareplyRepository, "setMetaOauthPages").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "short-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "long-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ client_business_id: "business-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "temporary-business-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "page-1", name: "Amadeo" }] }) }));

    await expect(metaMessengerService.handleOAuthCallback({ state: "known-state", code: "authorization-code" })).resolves.toMatchObject({
      ok: true,
      sessionId: "owner-session-3",
    });
    expect(savePages).toHaveBeenCalledWith("owner-session-3", [{ id: "page-1", name: "Amadeo" }]);
  });

  it("requires repository-scoped ownership for Page selection sessions", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSession").mockResolvedValue(undefined);
    await expect(metaMessengerService.selectPage(scope, { sessionId: "session-from-another-owner", pageId: "page-1" })).rejects.toThrow("Meta Page selection session is unavailable.");
  });

  it("returns expired for an expired OAuth Page-list session without exposing candidates", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSession").mockResolvedValue({ id: "session-expired", status: "pending", expiresAt: new Date(Date.now() - 1), pageCandidates: [{ id: "page-1", name: "Must not return" }] } as never);
    await expect(metaMessengerService.getOAuthPages(scope, "session-expired")).resolves.toEqual({ configured: true, status: "expired", pages: [] });
  });

  it("serializes owner Meta status without token, credential, or secret fields", async () => {
    vi.spyOn(nexareplyRepository, "getWorkspaceScope").mockResolvedValue(scope);
    vi.spyOn(nexareplyRepository, "getMetaConnection").mockResolvedValue({ pageId: "page-1", pageName: "TechZone", status: "connected", lastError: null, webhookVerifiedAt: null, lastInboundAt: null, lastDeliveryAt: null, accessToken: "must-not-leak", encryptedBlob: "must-not-leak" } as never);
    const response = await appRouter.createCaller(ownerContext()).nexareply.workspace.owner.meta.status({ organizationId: 7 });
    expect(response).toMatchObject({ configured: true, readiness: { appCredentials: true, webhookChallenge: true, pageDelivery: true, oauthRedirect: true }, status: "connected", page: { id: "page-1", name: "TechZone" } });
    expect(JSON.stringify(response)).not.toMatch(/accessToken|encrypted|secret|must-not-leak/i);
  });

  it("returns a safe delivery-failed state when the server-side Graph API request is rejected", async () => {
    vi.spyOn(nexareplyRepository, "getMetaConnection").mockResolvedValue({ pageId: "page-1", status: "connected" } as never);
    const updateStatus = vi.spyOn(nexareplyRepository, "updateMetaConnectionStatus").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: "Provider rejected request" } }) }));
    await expect(metaMessengerService.sendText(scope, { psid: "psid-1", text: "ტესტი" })).resolves.toEqual({ delivered: false, status: "delivery_failed", error: "Meta message delivery failed." });
    expect(updateStatus).toHaveBeenCalledWith(scope, expect.objectContaining({ status: "delivery_failed", delivery: true }));
  });

  it("stops an outbound Page send at the tenant rate limit before calling Graph", async () => {
    vi.spyOn(nexareplyRepository, "getMetaConnection").mockResolvedValue({ pageId: "page-1", status: "connected" } as never);
    vi.mocked(nexareplyRepository.consumeRateLimit).mockResolvedValue({ allowed: false, hits: 121, remaining: 0, windowStartsAt: new Date() });
    const graph = vi.fn();
    vi.stubGlobal("fetch", graph);

    await expect(metaMessengerService.sendText(scope, { psid: "psid-1", text: "ტესტი" })).resolves.toEqual({ delivered: false, status: "delivery_failed", error: "Meta message rate limit reached. Try again in the next minute." });
    expect(graph).not.toHaveBeenCalled();
  });

  it("uses META_LOGIN_CONFIG_ID without a competing scope list when configured", () => {
    process.env.META_LOGIN_CONFIG_ID = "business-login-config-123";
    const start = metaMessengerService.createOAuthStart(scope);
    const url = new URL(start.authorizationUrl!);
    expect(url.searchParams.get("config_id")).toBe("business-login-config-123");
    expect(url.searchParams.get("scope")).toBeNull();
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("keeps the generic OAuth scope fallback when META_LOGIN_CONFIG_ID is absent", () => {
    delete process.env.META_LOGIN_CONFIG_ID;
    const start = metaMessengerService.createOAuthStart(scope);
    const url = new URL(start.authorizationUrl!);
    expect(url.searchParams.get("config_id")).toBeNull();
    expect(url.searchParams.get("scope")).toContain("pages_messaging");
  });

  it("rejects manual Page credentials while the explicit manual setup kill-switch is enabled", async () => {
    process.env.ENABLE_META_MANUAL_SETUP = "false";
    const graph = vi.fn();
    vi.stubGlobal("fetch", graph);
    await expect(metaMessengerService.connectManualPage(scope, { pageId: "123456789", pageAccessToken: "manual-page-token-must-not-be-accepted-when-disabled" })).rejects.toThrow("Manual Meta setup is disabled.");
    expect(graph).not.toHaveBeenCalled();
  });

  it("auto-connects exactly one usable returned Page only after identity and webhook verification", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSessionByStateHash").mockResolvedValue({ id: "auto-session", organizationId: 7, userId: 9, status: "pending", expiresAt: new Date(Date.now() + 60_000) } as never);
    vi.spyOn(nexareplyRepository, "stageMetaOauthPageTokens").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "setMetaOauthPages").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "getMetaOauthSession").mockResolvedValue({ id: "auto-session", organizationId: 7, userId: 9, status: "pages_ready", expiresAt: new Date(Date.now() + 60_000), pageCandidates: [{ id: "page-auto", name: "Auto Page" }] } as never);
    vi.spyOn(nexareplyRepository, "getStagedMetaPageToken").mockResolvedValue({ encryptedPageToken: sealMetaPageToken("auto-page-token") } as never);
    vi.spyOn(nexareplyRepository, "upsertMetaTokenVault").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "upsertMetaConnection").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "completeMetaOauthSession").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "clearStagedMetaPageTokens").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "short-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "long-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "page-auto", name: "Auto Page", access_token: "auto-page-token" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "page-auto", name: "Auto Page" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }));

    await expect(metaMessengerService.handleOAuthCallback({ state: "auto-state", code: "authorization-code" })).resolves.toMatchObject({
      ok: true,
      status: "connected",
      page: { id: "page-auto", name: "Auto Page" },
    });
  });

  it("keeps a multiple-Page result in the picker instead of choosing silently", async () => {
    vi.spyOn(nexareplyRepository, "getMetaOauthSessionByStateHash").mockResolvedValue({ id: "multi-session", organizationId: 7, userId: 9, status: "pending", expiresAt: new Date(Date.now() + 60_000) } as never);
    const savePages = vi.spyOn(nexareplyRepository, "setMetaOauthPages").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "stageMetaOauthPageTokens").mockResolvedValue(undefined);
    const selectPage = vi.spyOn(metaMessengerService, "selectPage");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "short-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "long-lived-owner-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [
        { id: "page-a", name: "Page A", access_token: "page-a-token" },
        { id: "page-b", name: "Page B", access_token: "page-b-token" },
      ] }) }));

    await expect(metaMessengerService.handleOAuthCallback({ state: "multi-state", code: "authorization-code" })).resolves.toEqual({
      ok: true,
      message: "Pages are ready for selection.",
      sessionId: "multi-session",
    });
    expect(savePages).toHaveBeenCalledWith("multi-session", [{ id: "page-a", name: "Page A" }, { id: "page-b", name: "Page B" }]);
    expect(selectPage).not.toHaveBeenCalled();
  });

  it("unsubscribes a tenant Page before clearing its encrypted vault on disconnect", async () => {
    vi.spyOn(nexareplyRepository, "getMetaConnection").mockResolvedValue({ id: 17, pageId: "page-disconnect", pageName: "Disconnect Page", status: "connected", credentialMode: "tenant_vault" } as never);
    vi.spyOn(nexareplyRepository, "getMetaTokenVault").mockResolvedValue({ pageId: "page-disconnect", encryptedPageToken: sealMetaPageToken("disconnect-page-token") } as never);
    const clear = vi.spyOn(nexareplyRepository, "disconnectMetaConnection").mockResolvedValue(undefined);
    const graph = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", graph);

    await expect(metaMessengerService.disconnect(scope)).resolves.toEqual({ configured: true, status: "disabled" });
    expect(graph).toHaveBeenCalledTimes(1);
    expect(new URL(graph.mock.calls[0]?.[0] as string).pathname).toContain("/page-disconnect/subscribed_apps");
    expect(clear).toHaveBeenCalledWith(scope);
  });

  it("keeps the tenant vault when Meta rejects disconnect", async () => {
    vi.spyOn(nexareplyRepository, "getMetaConnection").mockResolvedValue({ id: 18, pageId: "page-protected", pageName: "Protected Page", status: "connected", credentialMode: "tenant_vault" } as never);
    vi.spyOn(nexareplyRepository, "getMetaTokenVault").mockResolvedValue({ pageId: "page-protected", encryptedPageToken: sealMetaPageToken("protected-page-token") } as never);
    const clear = vi.spyOn(nexareplyRepository, "disconnectMetaConnection").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { message: "permission denied" } }) }));

    await expect(metaMessengerService.disconnect(scope)).resolves.toEqual({ configured: true, status: "disconnect_failed" });
    expect(clear).not.toHaveBeenCalled();
  });

  it("accepts a valid signed deauthorization request without exposing provider identity", () => {
    const result = metaMessengerService.handleDeauthorization(signedMetaRequest({ algorithm: "HMAC-SHA256", user_id: "facebook-user-123", issued_at: 1700000000 }));
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain("facebook-user-123");
    expect(result).toMatchObject({ confirmationCode: expect.any(String) });
  });

  it("returns Meta-compatible data-deletion confirmation metadata only for a valid signature", () => {
    const result = metaMessengerService.handleDataDeletionRequest(signedMetaRequest({ algorithm: "HMAC-SHA256", user_id: "facebook-user-456", issued_at: 1700000001 }));
    expect(result).toMatchObject({ ok: true, url: expect.stringContaining("/data-deletion?confirmation_code="), confirmationCode: expect.any(String) });
    expect(JSON.stringify(result)).not.toContain("facebook-user-456");
  });

  it("rejects tampered signed requests before any deletion response is produced", () => {
    const signed = signedMetaRequest({ algorithm: "HMAC-SHA256", user_id: "facebook-user-789", issued_at: 1700000002 });
    const tampered = `${signed.slice(0, -1)}x`;
    expect(metaMessengerService.handleDeauthorization(tampered)).toEqual({ ok: false, reason: "invalid_signature" });
    expect(metaMessengerService.handleDataDeletionRequest(tampered)).toEqual({ ok: false, reason: "invalid_signature" });
  });
});
