import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { integrationSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { openMetaPageToken, sealMetaPageToken } from "./metaTokenVault";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import { dispatchDurableQueueWakeup } from "./durableQueueDispatcher";

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION?.trim() || "v24.0";
const META_OAUTH_TTL_MS = 10 * 60 * 1000;

type MetaConfig = {
  appId: string;
  appSecret: string;
  verifyToken: string;
  pageAccessToken: string;
  redirectUri: string;
};

type MetaOAuthConfig = Omit<MetaConfig, "pageAccessToken">;

type MetaRuntimeReadiness = {
  appCredentials: boolean;
  webhookChallenge: boolean;
  pageDelivery: boolean;
  oauthRedirect: boolean;
  businessLoginConfiguration: boolean;
  manualSetupEnabled: boolean;
};

type MetaPageCandidate = {
  id: string;
  name: string;
};

type MetaPageCredential = MetaPageCandidate & {
  accessToken?: string;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: { mid?: string; text?: string; is_echo?: boolean };
      postback?: { payload?: string; title?: string };
      delivery?: { mids?: string[] };
      read?: { watermark?: number };
    }>;
  }>;
};

function readMetaOAuthConfig(): MetaOAuthConfig | null {
  const appId = process.env.META_APP_ID?.trim() || "";
  const appSecret = process.env.META_APP_SECRET?.trim() || "";
  const verifyToken = process.env.META_VERIFY_TOKEN?.trim() || "";
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI?.trim() || "";
  return appId && appSecret && verifyToken && redirectUri
    ? { appId, appSecret, verifyToken, redirectUri }
    : null;
}

function readMetaLoginConfigId() {
  return process.env.META_LOGIN_CONFIG_ID?.trim() || "";
}

function isManualMetaSetupEnabled() {
  // The manual flow is owner-only at the router boundary. Keep an explicit
  // false value as an emergency kill-switch, but make the Alita-style setup
  // available by default so owners can actually use the secure fallback.
  return process.env.ENABLE_META_MANUAL_SETUP?.trim().toLowerCase() !== "false";
}

// `META_PAGE_ACCESS_TOKEN` is retained only as an optional, legacy pilot fallback.
// Every self-service tenant stores its own Page credential in the encrypted vault.
function readMetaConfig(): MetaConfig | null {
  const oauth = readMetaOAuthConfig();
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN?.trim() || "";
  return oauth && pageAccessToken ? { ...oauth, pageAccessToken } : null;
}

function readMetaRuntimeReadiness(): MetaRuntimeReadiness {
  const appId = process.env.META_APP_ID?.trim() || "";
  const appSecret = process.env.META_APP_SECRET?.trim() || "";
  const verifyToken = process.env.META_VERIFY_TOKEN?.trim() || "";
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN?.trim() || "";
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI?.trim() || "";
  return {
    appCredentials: Boolean(appId && appSecret),
    webhookChallenge: Boolean(verifyToken),
    pageDelivery: Boolean(pageAccessToken),
    oauthRedirect: Boolean(redirectUri),
    businessLoginConfiguration: Boolean(readMetaLoginConfigId()),
    manualSetupEnabled: isManualMetaSetupEnabled(),
  };
}

function readWebhookVerifyToken() {
  return process.env.META_VERIFY_TOKEN?.trim() || "";
}

function readWebhookAppSecret() {
  return process.env.META_APP_SECRET?.trim() || "";
}

function webhookSignature(rawBody: Buffer, appSecret: string) {
  return `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

function stateHash(state: string) {
  return crypto.createHash("sha256").update(state).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBytes = Buffer.from(a, "utf8");
  const bBytes = Buffer.from(b, "utf8");
  return aBytes.length === bBytes.length && crypto.timingSafeEqual(aBytes, bBytes);
}

function decodeBase64Url(input: string) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function parseMetaSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSignature, encodedPayload] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload) return null;
  const expected = crypto.createHmac("sha256", appSecret).update(encodedPayload).digest("base64url");
  if (!safeEqual(encodedSignature, expected)) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as { algorithm?: string; user_id?: string; issued_at?: number };
    if (payload.algorithm && payload.algorithm !== "HMAC-SHA256") return null;
    if (!payload.user_id || typeof payload.user_id !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

function signedRequestConfirmationCode(userId: string, issuedAt: number | undefined, appSecret: string) {
  return crypto.createHash("sha256").update(`${userId}:${issuedAt ?? ""}:${appSecret}`).digest("hex").slice(0, 20);
}

function safeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Meta request failure";
  return message.slice(0, 500);
}

async function graphRequest<T>(path: string, input: { method?: "GET" | "POST" | "DELETE"; accessToken?: string; body?: Record<string, unknown> } = {}) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${path.replace(/^\//, "")}`);
  if (input.accessToken) url.searchParams.set("access_token", input.accessToken);
  const response = await fetch(url, {
    method: input.method ?? "GET",
    headers: input.body ? { "Content-Type": "application/json" } : undefined,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = typeof body?.error?.message === "string" ? body.error.message : `Meta returned ${response.status}`;
    throw new Error(providerMessage);
  }
  return body as T;
}

function appSecretProof(accessToken: string, appSecret: string) {
  return crypto.createHmac("sha256", appSecret).update(accessToken).digest("hex");
}

type MetaPageListResponse = {
  data?: Array<{ id?: string; name?: string; access_token?: string; tasks?: string[] }>;
  error?: { message?: string };
};

async function loadPageCandidates(accessToken: string, config: MetaOAuthConfig): Promise<MetaPageCredential[]> {
  const pagesUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/accounts`);
  pagesUrl.searchParams.set("fields", "id,name,access_token,tasks");
  pagesUrl.searchParams.set("access_token", accessToken);
  pagesUrl.searchParams.set("appsecret_proof", appSecretProof(accessToken, config.appSecret));
  const pagesResponse = await fetch(pagesUrl);
  const pagesPayload = await pagesResponse.json().catch(() => ({})) as MetaPageListResponse;
  if (!pagesResponse.ok) throw new Error(pagesPayload.error?.message || "Meta Page list could not be loaded.");

  // `pages_show_list` guarantees a Page list, while Graph can omit `tasks` or a Page
  // access token for otherwise valid Full-control owners. Keep the callback limited to
  // safe Page identity metadata; the later server-side subscription request remains the
  // authoritative permission check before a connection is persisted.
  return (pagesPayload.data ?? [])
    .filter((page) => page.id && page.name)
    .map((page) => ({ id: page.id!, name: page.name!, accessToken: page.access_token }));
}

async function loadBusinessIntegrationPageToken(accessToken: string, config: MetaOAuthConfig): Promise<string | null> {
  const identityUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/me`);
  identityUrl.searchParams.set("fields", "client_business_id");
  identityUrl.searchParams.set("access_token", accessToken);
  identityUrl.searchParams.set("appsecret_proof", appSecretProof(accessToken, config.appSecret));
  const identityResponse = await fetch(identityUrl);
  const identityPayload = await identityResponse.json().catch(() => ({})) as { client_business_id?: string; error?: { message?: string } };
  if (!identityResponse.ok || !identityPayload.client_business_id) return null;

  const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(identityPayload.client_business_id)}/system_user_access_tokens`);
  tokenUrl.searchParams.set("fetch_only", "true");
  tokenUrl.searchParams.set("access_token", accessToken);
  tokenUrl.searchParams.set("appsecret_proof", appSecretProof(accessToken, config.appSecret));
  const tokenResponse = await fetch(tokenUrl);
  const tokenPayload = await tokenResponse.json().catch(() => ({})) as { access_token?: string };
  return tokenResponse.ok && tokenPayload.access_token ? tokenPayload.access_token : null;
}

async function exchangeCodeForPages(code: string, config: MetaOAuthConfig): Promise<MetaPageCredential[]> {
  // The Graph endpoint requires these values as query parameters; build them separately so the authorization code remains server-side.
  const exchangeUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`);
  exchangeUrl.searchParams.set("client_id", config.appId);
  exchangeUrl.searchParams.set("client_secret", config.appSecret);
  exchangeUrl.searchParams.set("redirect_uri", config.redirectUri);
  exchangeUrl.searchParams.set("code", code);
  const exchangeResponse = await fetch(exchangeUrl);
  const exchangePayload = await exchangeResponse.json().catch(() => ({})) as { access_token?: string; error?: { message?: string } };
  if (!exchangeResponse.ok || !exchangePayload.access_token) throw new Error(exchangePayload.error?.message || "Meta OAuth exchange was rejected.");

  const longLivedUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", config.appId);
  longLivedUrl.searchParams.set("client_secret", config.appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", exchangePayload.access_token);
  const longLivedResponse = await fetch(longLivedUrl);
  const longLivedPayload = await longLivedResponse.json().catch(() => ({})) as { access_token?: string };
  const ownerToken = longLivedResponse.ok && longLivedPayload.access_token ? longLivedPayload.access_token : exchangePayload.access_token;

  const directCandidates = await loadPageCandidates(ownerToken, config);
  if (directCandidates.length) return directCandidates;

  // Facebook Login for Business may return a System User token associated with a
  // client business. When that happens, `/me/accounts` can be empty until the granted
  // business token is fetched through Meta's read-only token endpoint. The token is
  // used only within this request and is never stored in the database or returned.
  const businessToken = await loadBusinessIntegrationPageToken(ownerToken, config);
  return businessToken ? loadPageCandidates(businessToken, config) : directCandidates;
}

async function persistTenantPageConnection(scope: WorkspaceScope, page: MetaPageCandidate, encryptedPageToken: string) {
  await nexareplyRepository.upsertMetaTokenVault(scope, { pageId: page.id, encryptedPageToken });
  await nexareplyRepository.upsertMetaConnection(scope, {
    pageId: page.id,
    pageName: page.name,
    status: "connected",
    credentialMode: "tenant_vault",
  });
  const db = await getDb();
  if (db) {
    await db.update(integrationSettings)
      .set({ status: "configured", settings: { pageId: page.id, pageName: page.name } })
      .where(and(eq(integrationSettings.organizationId, scope.organizationId), eq(integrationSettings.provider, "meta")));
  }
}

function eventKey(entryPageId: string, event: NonNullable<NonNullable<MetaWebhookPayload["entry"]>[number]["messaging"]>[number]) {
  if (event.message?.mid) return `message:${event.message.mid}`;
  if (event.delivery?.mids?.length) return `delivery:${event.delivery.mids.join(",")}`;
  const canonical = JSON.stringify({ page: entryPageId, sender: event.sender?.id, recipient: event.recipient?.id, timestamp: event.timestamp, postback: event.postback, read: event.read });
  return `event:${crypto.createHash("sha256").update(canonical).digest("hex")}`;
}

function eventType(event: NonNullable<NonNullable<MetaWebhookPayload["entry"]>[number]["messaging"]>[number]) {
  if (event.message) return event.message.is_echo ? "message_echo" : "message";
  if (event.postback) return "postback";
  if (event.delivery) return "delivery";
  if (event.read) return "read";
  return "unknown";
}

export const metaMessengerService = {
  isConfigured() {
    return Boolean(readMetaOAuthConfig());
  },

  isManualSetupEnabled() {
    return isManualMetaSetupEnabled();
  },

  getWebhookVerifyToken() {
    if (!isManualMetaSetupEnabled()) return { enabled: false as const, verifyToken: null };
    const verifyToken = readWebhookVerifyToken();
    return verifyToken ? { enabled: true as const, verifyToken } : { enabled: false as const, verifyToken: null };
  },

  createOAuthStart(scope: WorkspaceScope) {
    const config = readMetaOAuthConfig();
    if (!config) return { configured: false as const, authorizationUrl: null, sessionId: null };
    const sessionId = crypto.randomBytes(24).toString("base64url");
    const state = crypto.randomBytes(32).toString("base64url");
    const authorizationUrl = new URL(`https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth`);
    authorizationUrl.searchParams.set("client_id", config.appId);
    authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("response_type", "code");
    const businessLoginConfigId = readMetaLoginConfigId();
    if (businessLoginConfigId) {
      // Meta Business Login configurations define assets and permissions; do not add a competing scope list.
      authorizationUrl.searchParams.set("config_id", businessLoginConfigId);
    } else {
      // Preserve the App Admin/Developer/Tester-compatible authorization path until a configuration ID is supplied.
      authorizationUrl.searchParams.set("scope", "business_management,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging");
    }
    return { configured: true as const, authorizationUrl: authorizationUrl.toString(), sessionId, stateHash: stateHash(state), expiresAt: new Date(Date.now() + META_OAUTH_TTL_MS) };
  },

  async persistOAuthStart(scope: WorkspaceScope) {
    const start = this.createOAuthStart(scope);
    if (!start.configured) return start;
    await nexareplyRepository.createMetaOauthSession(scope, { id: start.sessionId!, stateHash: start.stateHash!, expiresAt: start.expiresAt! });
    return { configured: true as const, authorizationUrl: start.authorizationUrl, sessionId: start.sessionId };
  },

  async handleOAuthCallback(input: { state?: string; code?: string; error?: string }) {
    const config = readMetaOAuthConfig();
    if (!config || !input.state) return { ok: false as const, message: "Meta integration is not configured." };
    const session = await nexareplyRepository.getMetaOauthSessionByStateHash(stateHash(input.state));
    if (!session || session.status !== "pending" || session.expiresAt.getTime() < Date.now()) return { ok: false as const, message: "Meta authorization request has expired or is invalid." };
    if (input.error || !input.code) {
      await nexareplyRepository.failMetaOauthSession(session.id, "Authorization was cancelled or denied.");
      return { ok: false as const, message: "Meta authorization was cancelled or denied.", sessionId: session.id };
    }
    try {
      const pages = await exchangeCodeForPages(input.code, config);
      if (!pages.length) throw new Error("No Messenger-eligible Page was returned for this account.");
      const scope: WorkspaceScope = { organizationId: session.organizationId, role: "owner", isDemo: false, actorUserId: session.userId };
      // Some Facebook Login for Business responses return safe Page metadata before a
      // Page credential is available. Keep that discovery result visible, but do not
      // create an empty staged-token record; selection will then explicitly request a
      // fresh authorization rather than persisting an unusable connection.
      const credentials = pages
        .filter((page) => Boolean(page.accessToken))
        .map((page) => ({ pageId: page.id, encryptedPageToken: sealMetaPageToken(page.accessToken!), expiresAt: session.expiresAt }));
      if (credentials.length) await nexareplyRepository.stageMetaOauthPageTokens(scope, session.id, credentials);
      await nexareplyRepository.setMetaOauthPages(session.id, pages.map(({ id, name }) => ({ id, name })));
      if (pages.length === 1 && credentials.length === 1 && credentials[0]?.pageId === pages[0]?.id) {
        const autoConnection = await this.selectPage(scope, { sessionId: session.id, pageId: pages[0].id });
        if (autoConnection.status === "connected") {
          return { ok: true as const, message: "Facebook Page connected.", sessionId: session.id, status: "connected" as const, page: autoConnection.page };
        }
      }
      return { ok: true as const, message: "Pages are ready for selection.", sessionId: session.id };
    } catch (error) {
      const message = safeProviderError(error);
      await nexareplyRepository.failMetaOauthSession(session.id, message);
      return { ok: false as const, message: "Meta authorization could not be completed.", sessionId: session.id };
    }
  },

  async getOAuthPages(scope: WorkspaceScope, sessionId: string) {
    const config = readMetaOAuthConfig();
    if (!config) return { configured: false as const, status: "unconfigured" as const, pages: [] as Array<{ id: string; name: string }> };
    const session = await nexareplyRepository.getMetaOauthSession(scope, sessionId);
    if (!session) throw new Error("Meta authorization session was not found.");
    if (session.expiresAt.getTime() < Date.now() && session.status === "pending") return { configured: true as const, status: "expired" as const, pages: [] as Array<{ id: string; name: string }> };
    if (session.status !== "pages_ready" || !session.pageCandidates) return { configured: true as const, status: session.status, pages: [] as Array<{ id: string; name: string }> };
    const candidates = session.pageCandidates as MetaPageCandidate[];
    return { configured: true as const, status: "pages_ready" as const, pages: candidates.map(({ id, name }) => ({ id, name })) };
  },

  async selectPage(scope: WorkspaceScope, input: { sessionId: string; pageId: string }) {
    const config = readMetaOAuthConfig();
    if (!config) return { configured: false as const, status: "unconfigured" as const };
    const session = await nexareplyRepository.getMetaOauthSession(scope, input.sessionId);
    if (!session || session.status !== "pages_ready" || !session.pageCandidates || session.expiresAt.getTime() < Date.now()) throw new Error("Meta Page selection session is unavailable.");
    const candidates = session.pageCandidates as MetaPageCandidate[];
    const selected = candidates.find((candidate) => candidate.id === input.pageId);
    if (!selected) throw new Error("Selected Meta Page is not part of this authorization session.");
    const staged = await nexareplyRepository.getStagedMetaPageToken(scope, session.id, selected.id);
    if (!staged) throw new Error("Selected Meta Page credential has expired. Start authorization again.");
    try {
      const verifiedPage = await graphRequest<{ id?: string; name?: string }>(`${encodeURIComponent(selected.id)}?fields=id,name`, {
        accessToken: openMetaPageToken(staged.encryptedPageToken),
      });
      if (verifiedPage.id !== selected.id || !verifiedPage.name) throw new Error("Page identity could not be verified.");
      await graphRequest<{ success?: boolean }>(`${selected.id}/subscribed_apps`, {
        method: "POST",
        accessToken: openMetaPageToken(staged.encryptedPageToken),
        body: { subscribed_fields: "messages,message_deliveries,message_echoes,messaging_postbacks" },
      });
      await persistTenantPageConnection(scope, { id: verifiedPage.id, name: verifiedPage.name }, staged.encryptedPageToken);
      await nexareplyRepository.completeMetaOauthSession(scope, session.id);
      await nexareplyRepository.clearStagedMetaPageTokens(scope, session.id);
      return { configured: true as const, status: "connected" as const, page: { id: verifiedPage.id, name: verifiedPage.name } };
    } catch (error) {
      const message = safeProviderError(error);
      await nexareplyRepository.upsertMetaConnection(scope, {
        pageId: selected.id,
        pageName: selected.name,
        status: "verification_failed",
        lastError: message,
      });
      return { configured: true as const, status: "verification_failed" as const };
    }
  },

  async connectManualPage(scope: WorkspaceScope, input: { pageId: string; pageAccessToken: string }) {
    if (!readMetaOAuthConfig()) return { configured: false as const, status: "unconfigured" as const };
    const pageId = input.pageId.trim();
    if (!isManualMetaSetupEnabled()) throw new Error("Manual Meta setup is disabled.");
    const pageAccessToken = input.pageAccessToken.trim();
    try {
      // Meta validates both Page ownership and the token's scopes here. The plaintext
      // credential exists only in this server request and is never included in an audit
      // record, tRPC response, browser state, or provider error shown to the user.
      const page = await graphRequest<{ id?: string; name?: string }>(`${encodeURIComponent(pageId)}?fields=id,name`, {
        accessToken: pageAccessToken,
      });
      if (page.id !== pageId || !page.name) throw new Error("Page identity could not be verified.");
      const subscription = await graphRequest<{ success?: boolean }>(`${encodeURIComponent(pageId)}/subscribed_apps`, {
        method: "POST",
        accessToken: pageAccessToken,
        body: { subscribed_fields: "messages,message_deliveries,message_echoes,messaging_postbacks" },
      });
      if (subscription.success === false) throw new Error("Webhook subscription could not be enabled.");
      await persistTenantPageConnection(scope, { id: page.id, name: page.name }, sealMetaPageToken(pageAccessToken));
      return { configured: true as const, status: "connected" as const, page: { id: page.id, name: page.name } };
    } catch {
      // Do not overwrite a healthy existing connection or surface provider diagnostics
      // that may contain sensitive request context.
      return { configured: true as const, status: "verification_failed" as const };
    }
  },

  async getConnectionStatus(scope: WorkspaceScope) {
    const connection = await nexareplyRepository.getMetaConnection(scope);
    const readiness = readMetaRuntimeReadiness();
    if (!readMetaOAuthConfig()) return { configured: false as const, readiness, status: "unconfigured" as const, page: null, lastError: null, webhookVerifiedAt: null, lastInboundAt: null, lastDeliveryAt: null };
    return {
      configured: true as const,
      readiness,
      status: connection?.status ?? "unconfigured",
      page: connection?.pageId && connection.pageName ? { id: connection.pageId, name: connection.pageName } : null,
      credentialMode: connection?.credentialMode ?? "none",
      lastError: connection?.lastError ?? null,
      webhookVerifiedAt: connection?.webhookVerifiedAt ?? null,
      lastInboundAt: connection?.lastInboundAt ?? null,
      lastDeliveryAt: connection?.lastDeliveryAt ?? null,
    };
  },

  handleDeauthorization(signedRequest: string) {
    const appSecret = readWebhookAppSecret();
    if (!appSecret) return { ok: false as const, reason: "unconfigured" as const };
    const payload = parseMetaSignedRequest(signedRequest, appSecret);
    if (!payload) return { ok: false as const, reason: "invalid_signature" as const };
    return { ok: true as const, confirmationCode: signedRequestConfirmationCode(payload.user_id!, payload.issued_at, appSecret) };
  },

  handleDataDeletionRequest(signedRequest: string) {
    const appSecret = readWebhookAppSecret();
    if (!appSecret) return { ok: false as const, reason: "unconfigured" as const };
    const payload = parseMetaSignedRequest(signedRequest, appSecret);
    if (!payload) return { ok: false as const, reason: "invalid_signature" as const };
    const confirmationCode = signedRequestConfirmationCode(payload.user_id!, payload.issued_at, appSecret);
    const publicOrigin = new URL(readMetaOAuthConfig()?.redirectUri ?? "https://nexareply-2chxuc4s.manus.space/api/integrations/meta/callback").origin;
    return { ok: true as const, url: `${publicOrigin}/data-deletion?confirmation_code=${encodeURIComponent(confirmationCode)}`, confirmationCode };
  },

  async disconnect(scope: WorkspaceScope) {
    if (!readMetaOAuthConfig()) return { configured: false as const, status: "unconfigured" as const };
    const connection = await nexareplyRepository.getMetaConnection(scope);
    const vault = connection?.credentialMode === "tenant_vault" ? await nexareplyRepository.getMetaTokenVault(scope) : null;
    if (connection?.pageId && vault?.encryptedPageToken) {
      try {
        await graphRequest<{ success?: boolean }>(`${encodeURIComponent(connection.pageId)}/subscribed_apps`, { method: "DELETE", accessToken: openMetaPageToken(vault.encryptedPageToken) });
      } catch {
        return { configured: true as const, status: "disconnect_failed" as const };
      }
    }
    await nexareplyRepository.disconnectMetaConnection(scope);
    return { configured: true as const, status: "disabled" as const };
  },
  verifyWebhookChallenge(query: Record<string, unknown>) {
    const verifyToken = readWebhookVerifyToken();
    const mode = typeof query["hub.mode"] === "string" ? query["hub.mode"] : "";
    const token = typeof query["hub.verify_token"] === "string" ? query["hub.verify_token"] : "";
    const challenge = typeof query["hub.challenge"] === "string" ? query["hub.challenge"] : "";
    if (!verifyToken || mode !== "subscribe" || !challenge || !safeEqual(token, verifyToken)) return null;
    return challenge;
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    const appSecret = readWebhookAppSecret();
    if (!appSecret || !signature?.startsWith("sha256=")) return false;
    const expected = webhookSignature(rawBody, appSecret);
    return safeEqual(signature, expected);
  },

  async handleWebhookPayload(payload: MetaWebhookPayload) {
    if (payload.object !== "page") return { accepted: false, processed: 0, duplicates: 0 };
    let processed = 0;
    let duplicates = 0;
    for (const entry of payload.entry ?? []) {
      if (!entry.id) continue;
      const connection = await nexareplyRepository.getMetaConnectionByPageId(entry.id);
      if (!connection || connection.status !== "connected") continue;
      const scope: WorkspaceScope = { organizationId: connection.organizationId, role: "owner", isDemo: false };
      for (const event of entry.messaging ?? []) {
        const key = eventKey(entry.id, event);
        const stored = await nexareplyRepository.createMetaWebhookEventOnce({ organizationId: connection.organizationId, pageId: entry.id, eventKey: key, eventType: eventType(event), payload: event as Record<string, unknown> });
        if (!stored.created) {
          duplicates += 1;
          continue;
        }
        if (!event.message?.text || event.message.is_echo || !event.sender?.id) {
          await nexareplyRepository.setMetaWebhookEventStatus(stored.event.id, "ignored");
          continue;
        }
        try {
          const conversation = await nexareplyRepository.getOrCreateMetaConversation(scope, { pageId: entry.id, psid: event.sender.id });
          const inboundEventId = `meta:${crypto.createHash("sha256").update(key).digest("hex").slice(0, 54)}`;
          await nexareplyRepository.addMessage(scope, { conversationId: conversation.id, sender: "customer", body: event.message.text, source: "meta", inboundEventId });
          const organization = await nexareplyRepository.getOrganization(scope);
          const scheduledAt = new Date(Date.now() + organization.debounceSeconds * 1000);
          await nexareplyRepository.scheduleConversationProcessing(scope, conversation.id, inboundEventId, scheduledAt);
          try { await dispatchDurableQueueWakeup(scheduledAt.getTime() - Date.now()); } catch { /* durable database job remains available for retry/recovery */ }
          await nexareplyRepository.updateMetaConnectionStatus(scope, { status: "connected", inbound: true });
          await nexareplyRepository.setMetaWebhookEventStatus(stored.event.id, "processed");
          processed += 1;
        } catch (error) {
          await nexareplyRepository.setMetaWebhookEventStatus(stored.event.id, "failed", safeProviderError(error));
          throw error;
        }
      }
    }
    return { accepted: true, processed, duplicates };
  },

  async sendText(scope: WorkspaceScope, input: { psid: string; text: string }) {
    if (!readMetaOAuthConfig()) return { delivered: false as const, status: "unconfigured" as const, error: "Meta integration is not configured." };
    const connection = await nexareplyRepository.getMetaConnection(scope);
    if (!connection?.pageId || connection.status !== "connected") return { delivered: false as const, status: connection?.status ?? "unconfigured", error: "Meta Page is not connected." };
    try {
      const rateLimit = await nexareplyRepository.consumeRateLimit(scope, "meta_outbound", 120);
      if (!rateLimit.allowed) return { delivered: false as const, status: "delivery_failed" as const, error: "Meta message rate limit reached. Try again in the next minute." };
      const vault = connection.credentialMode === "tenant_vault" ? await nexareplyRepository.getMetaTokenVault(scope) : null;
      const pageAccessToken = vault ? openMetaPageToken(vault.encryptedPageToken) : process.env.META_PAGE_ACCESS_TOKEN?.trim();
      if (!pageAccessToken || (vault && vault.pageId !== connection.pageId)) throw new Error("Meta Page credential is unavailable.");
      const response = await graphRequest<{ recipient_id?: string; message_id?: string }>(`${connection.pageId}/messages`, {
        method: "POST",
        accessToken: pageAccessToken,
        body: { recipient: { id: input.psid }, messaging_type: "RESPONSE", message: { text: input.text } },
      });
      await nexareplyRepository.updateMetaConnectionStatus(scope, { status: "connected", delivery: true });
      return { delivered: true as const, status: "connected" as const, messageId: response.message_id ?? null };
    } catch (error) {
      await nexareplyRepository.updateMetaConnectionStatus(scope, { status: "delivery_failed", error: safeProviderError(error), delivery: true });
      return { delivered: false as const, status: "delivery_failed" as const, error: "Meta message delivery failed." };
    }
  },
};
