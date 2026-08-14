import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { integrationSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { openMetaPageToken, sealMetaPageToken } from "./metaTokenVault";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION?.trim() || "v24.0";
const META_OAUTH_TTL_MS = 10 * 60 * 1000;

type MetaConfig = {
  appId: string;
  appSecret: string;
  verifyToken: string;
  pageAccessToken: string;
  redirectUri: string;
};

type MetaRuntimeReadiness = {
  appCredentials: boolean;
  webhookChallenge: boolean;
  pageDelivery: boolean;
  oauthRedirect: boolean;
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

function readMetaConfig(): MetaConfig | null {
  const appId = process.env.META_APP_ID?.trim() || "";
  const appSecret = process.env.META_APP_SECRET?.trim() || "";
  const verifyToken = process.env.META_VERIFY_TOKEN?.trim() || "";
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN?.trim() || "";
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI?.trim() || "";
  return appId && appSecret && verifyToken && pageAccessToken && redirectUri
    ? { appId, appSecret, verifyToken, pageAccessToken, redirectUri }
    : null;
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

function safeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Meta request failure";
  return message.slice(0, 500);
}

async function graphRequest<T>(path: string, input: { method?: "GET" | "POST"; accessToken?: string; body?: Record<string, unknown> } = {}) {
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

async function loadPageCandidates(accessToken: string, config: MetaConfig): Promise<MetaPageCredential[]> {
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

async function loadBusinessIntegrationPageToken(accessToken: string, config: MetaConfig): Promise<string | null> {
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

async function exchangeCodeForPages(code: string, config: MetaConfig): Promise<MetaPageCredential[]> {
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
    return Boolean(readMetaConfig());
  },

  createOAuthStart(scope: WorkspaceScope) {
    const config = readMetaConfig();
    if (!config) return { configured: false as const, authorizationUrl: null, sessionId: null };
    const sessionId = crypto.randomBytes(24).toString("base64url");
    const state = crypto.randomBytes(32).toString("base64url");
    const authorizationUrl = new URL(`https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth`);
    authorizationUrl.searchParams.set("client_id", config.appId);
    authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "business_management,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging");
    return { configured: true as const, authorizationUrl: authorizationUrl.toString(), sessionId, stateHash: stateHash(state), expiresAt: new Date(Date.now() + META_OAUTH_TTL_MS) };
  },

  async persistOAuthStart(scope: WorkspaceScope) {
    const start = this.createOAuthStart(scope);
    if (!start.configured) return start;
    await nexareplyRepository.createMetaOauthSession(scope, { id: start.sessionId!, stateHash: start.stateHash!, expiresAt: start.expiresAt! });
    return { configured: true as const, authorizationUrl: start.authorizationUrl, sessionId: start.sessionId };
  },

  async handleOAuthCallback(input: { state?: string; code?: string; error?: string }) {
    const config = readMetaConfig();
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
      await nexareplyRepository.stageMetaOauthPageTokens(scope, session.id, pages.filter((page) => Boolean(page.accessToken)).map((page) => ({ pageId: page.id, encryptedPageToken: sealMetaPageToken(page.accessToken!), expiresAt: session.expiresAt })));
      await nexareplyRepository.setMetaOauthPages(session.id, pages.map(({ id, name }) => ({ id, name })));
      return { ok: true as const, message: "Pages are ready for selection.", sessionId: session.id };
    } catch (error) {
      const message = safeProviderError(error);
      await nexareplyRepository.failMetaOauthSession(session.id, message);
      return { ok: false as const, message: "Meta authorization could not be completed.", sessionId: session.id };
    }
  },

  async getOAuthPages(scope: WorkspaceScope, sessionId: string) {
    const config = readMetaConfig();
    if (!config) return { configured: false as const, status: "unconfigured" as const, pages: [] as Array<{ id: string; name: string }> };
    const session = await nexareplyRepository.getMetaOauthSession(scope, sessionId);
    if (!session) throw new Error("Meta authorization session was not found.");
    if (session.expiresAt.getTime() < Date.now() && session.status === "pending") return { configured: true as const, status: "expired" as const, pages: [] as Array<{ id: string; name: string }> };
    if (session.status !== "pages_ready" || !session.pageCandidates) return { configured: true as const, status: session.status, pages: [] as Array<{ id: string; name: string }> };
    const candidates = session.pageCandidates as MetaPageCandidate[];
    return { configured: true as const, status: "pages_ready" as const, pages: candidates.map(({ id, name }) => ({ id, name })) };
  },

  async selectPage(scope: WorkspaceScope, input: { sessionId: string; pageId: string }) {
    const config = readMetaConfig();
    if (!config) return { configured: false as const, status: "unconfigured" as const };
    const session = await nexareplyRepository.getMetaOauthSession(scope, input.sessionId);
    if (!session || session.status !== "pages_ready" || !session.pageCandidates || session.expiresAt.getTime() < Date.now()) throw new Error("Meta Page selection session is unavailable.");
    const candidates = session.pageCandidates as MetaPageCandidate[];
    const selected = candidates.find((candidate) => candidate.id === input.pageId);
    if (!selected) throw new Error("Selected Meta Page is not part of this authorization session.");
    const staged = await nexareplyRepository.getStagedMetaPageToken(scope, session.id, selected.id);
    if (!staged) throw new Error("Selected Meta Page credential has expired. Start authorization again.");
    try {
      await graphRequest<{ success?: boolean }>(`${selected.id}/subscribed_apps`, {
        method: "POST",
        accessToken: openMetaPageToken(staged.encryptedPageToken),
        body: { subscribed_fields: "messages,message_deliveries,message_echoes,messaging_postbacks" },
      });
      await nexareplyRepository.upsertMetaTokenVault(scope, { pageId: selected.id, encryptedPageToken: staged.encryptedPageToken });
      await nexareplyRepository.upsertMetaConnection(scope, {
        pageId: selected.id,
        pageName: selected.name,
        status: "connected",
        credentialMode: "tenant_vault",
      });
      const db = await getDb();
      if (db) await db.update(integrationSettings).set({ status: "configured", settings: { pageId: selected.id, pageName: selected.name } }).where(and(eq(integrationSettings.organizationId, scope.organizationId), eq(integrationSettings.provider, "meta")));
      await nexareplyRepository.completeMetaOauthSession(scope, session.id);
      await nexareplyRepository.clearStagedMetaPageTokens(scope, session.id);
      return { configured: true as const, status: "connected" as const, page: { id: selected.id, name: selected.name } };
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

  async getConnectionStatus(scope: WorkspaceScope) {
    const connection = await nexareplyRepository.getMetaConnection(scope);
    const readiness = readMetaRuntimeReadiness();
    if (!readMetaConfig()) return { configured: false as const, readiness, status: "unconfigured" as const, page: null, lastError: null, webhookVerifiedAt: null, lastInboundAt: null, lastDeliveryAt: null };
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
          await nexareplyRepository.scheduleConversationProcessing(scope, conversation.id, inboundEventId, new Date(Date.now() + organization.debounceSeconds * 1000));
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
    const config = readMetaConfig();
    if (!config) return { delivered: false as const, status: "unconfigured" as const, error: "Meta integration is not configured." };
    const connection = await nexareplyRepository.getMetaConnection(scope);
    if (!connection?.pageId || connection.status !== "connected") return { delivered: false as const, status: connection?.status ?? "unconfigured", error: "Meta Page is not connected." };
    try {
      const rateLimit = await nexareplyRepository.consumeRateLimit(scope, "meta_outbound", 120);
      if (!rateLimit.allowed) return { delivered: false as const, status: "delivery_failed" as const, error: "Meta message rate limit reached. Try again in the next minute." };
      const vault = connection.credentialMode === "tenant_vault" ? await nexareplyRepository.getMetaTokenVault(scope) : null;
      const pageAccessToken = vault ? openMetaPageToken(vault.encryptedPageToken) : config.pageAccessToken;
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
