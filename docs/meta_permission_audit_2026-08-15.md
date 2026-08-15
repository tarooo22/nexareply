# Meta OAuth and Graph API Permission Audit

**Audit date:** 2026-08-15  
**Scope:** Read-only code and documentation review. No Graph API requests, source-code changes, Meta Dashboard changes, credential changes, Page subscription changes, or outbound messages were performed.

## Executive conclusion

NexaReply's ordinary self-service connection path needs **`pages_show_list`**, **`pages_manage_metadata`**, and **`pages_messaging`**. The current code does **not** independently use Page engagement/content/insights data, so **`pages_read_engagement` is not needed by the direct Page-list, webhook-subscription, webhook-ingestion, or Messenger-reply path itself**.

`business_management` is **not genuinely required for the normal multi-client flow** in which a workspace owner authorizes NexaReply, NexaReply lists that person's Pages through `/me/accounts`, the owner selects one Page, and NexaReply subscribes/sends with the selected Page token. It is currently requested because the implementation includes a **Facebook Login for Business System User fallback**. That fallback calls `/{client_business_id}/system_user_access_tokens`; Meta explicitly states that the access token used with that endpoint requires `business_management`. Therefore it is required only when retaining and using that fallback—not as a general prerequisite for a multi-client Page connection.

> Meta instructs apps to select only permissions actually needed, noting that unnecessary permissions are a common reason for App Review rejection. [1]

## Current NexaReply flow and Graph API inventory

| Stage | NexaReply route or service | External request | Purpose | Token handling |
| --- | --- | --- | --- | --- |
| Start OAuth | Owner-only tRPC flow calls `metaMessengerService.persistOAuthStart()` | `https://www.facebook.com/v24.0/dialog/oauth` | Starts an owner-scoped Facebook Login for Business session. | Browser receives only Meta authorization URL and opaque session state. |
| Exchange code | `GET /api/integrations/meta/callback` → `handleOAuthCallback()` | `GET /v24.0/oauth/access_token`; long-lived token exchange at the same endpoint | Exchanges the authorization code server-side. | User token stays server-side. |
| List candidate Pages | `exchangeCodeForPages()` → `loadPageCandidates()` | `GET /v24.0/me/accounts?fields=id,name,access_token,tasks` | Lists only Pages the authorizing person can manage; returns safe id/name to selection UI. | Page token is encrypted in a short-lived staged server record; never returned to browser. |
| Optional business fallback | `loadBusinessIntegrationPageToken()` | `GET /v24.0/me?fields=client_business_id`; `GET /v24.0/{client_business_id}/system_user_access_tokens?fetch_only=true`; then `/me/accounts` | Covers Facebook Login for Business responses in which direct `/me/accounts` is empty but Meta provides a client business/system-user path. | Temporary fallback token is used within the request and not persisted or returned. |
| Select and subscribe Page | `selectPage()` | `POST /v24.0/{page-id}/subscribed_apps` with `subscribed_fields=messages,message_deliveries,message_echoes,messaging_postbacks` | Enables Page webhook delivery before persisting the tenant connection. | Selected Page token is stored only as AES-256-GCM encrypted vault ciphertext. |
| Receive webhooks | `GET/POST /api/integrations/meta/webhook` | No outbound Graph request | Verifies challenge, validates `X-Hub-Signature-256`, deduplicates events, and stores/queues inbound messages. | No Page token is sent to client. |
| Send reply | `sendText()` | `POST /v24.0/{page-id}/messages` | Sends an operator-approved Messenger response using the connected Page token. | Page token is opened only server-side for the request. |

## Permission-to-endpoint mapping

| Permission | Exact current use | Current Graph endpoint(s) / user flow | Necessity finding |
| --- | --- | --- | --- |
| `pages_show_list` | Page discovery after a workspace owner authorizes Facebook Login for Business. | `GET /me/accounts?fields=id,name,access_token,tasks` → owner selects only a returned Page. | **Required.** Meta defines it as access to the list of Pages a person manages. [1] |
| `pages_manage_metadata` | Page webhook subscription. | `POST /{page-id}/subscribed_apps` with Messenger subscription fields. | **Required.** Meta states it permits an app to subscribe to and receive Page webhooks and update Page settings. [1] |
| `pages_messaging` | Messenger conversation capability and outbound replies. | `POST /{page-id}/messages`; incoming events are handled for the subscribed Page. | **Required.** Meta defines it as managing/accessing Page conversations in Messenger; the Send API requires a Page access token. [1] [3] |
| `pages_read_engagement` | No current direct use of Page posts, photos, videos, followers, insights, or profile data. | **None in current source.** No `/feed`, `/insights`, `/followers`, or Page-content endpoint is called. | **Not independently required by the present direct workflow.** It is documented as a dependency of `business_management`; retain only if the System User fallback remains and Meta requires the dependency. [1] |
| `business_management` | Only the optional System User fallback for Facebook Login for Business. | `GET /me?fields=client_business_id` then `GET /{client_business_id}/system_user_access_tokens?fetch_only=true`. | **Conditionally required, not core-required.** Meta explicitly requires it for the `system_user_access_tokens` endpoint. It is unnecessary for the normal direct `/me/accounts` multi-client connection path. [2] |

## Direct multi-client flow versus System User fallback

### Direct Page-owner flow

The normal multi-client path is straightforward: a business owner signs in, NexaReply calls `/me/accounts`, shows only that user's returned Pages, stores the selected Page token encrypted per organization, subscribes the app to the selected Page, and sends replies via that Page. This flow does **not** call a Business Manager asset-management endpoint or the System User token endpoint.

| Required for direct flow | Reason |
| --- | --- |
| `pages_show_list` | Discover the authorizing person's manageable Pages. |
| `pages_manage_metadata` | Subscribe the selected Page to Messenger webhooks. |
| `pages_messaging` | Operate Page Messenger conversations and send responses. |

### Optional Facebook Login for Business System User flow

The current fallback exists because Meta can issue a Facebook Login for Business response where direct `/me/accounts` is empty and a `client_business_id` is available. NexaReply then obtains an existing business-integration System User token and retries `/me/accounts`. This is the **only** code path using a Business Manager API endpoint.

Meta's Facebook Login for Business documentation states that the access token parameter for `/{CLIENT_BUSINESS_ID}/system_user_access_tokens` requires `business_management`. [2] Because Meta also lists `pages_read_engagement` and `pages_show_list` as dependencies of `business_management`, `pages_read_engagement` may be an indirect consequence of retaining the fallback even though NexaReply does not otherwise read engagement data. [1]

## Audit recommendation

No implementation change is made by this audit. For the current code exactly as written, the requested scope set is defensible only if NexaReply intends to retain the System User fallback:

`business_management,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging`

For the leanest direct, owner-authorized multi-client Page connection without the System User fallback, the scope set would be:

`pages_show_list,pages_manage_metadata,pages_messaging`

Before removing any scope in a future change, test the direct Facebook Login for Business response across the intended customer Page/account types. Before retaining `business_management` in App Review, demonstrate the fallback in the review recording and describe it narrowly: it fetches an already-authorized business integration System User token only when Meta's direct Page list is empty; NexaReply does not claim advertising assets, manage ad accounts, or expose business tokens.

## References

[1] [Meta Permissions Reference](https://developers.facebook.com/docs/permissions/)  
[2] [Meta Facebook Login for Business — System User Access Tokens](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)  
[3] [Meta Messenger Platform — Send a Message](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages)  
[4] [Meta Pages API — Manage a Page](https://developers.facebook.com/documentation/pages-api/manage-pages)
