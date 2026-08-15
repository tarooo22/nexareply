# NexaReply Facebook Messenger One-Click Onboarding — Design Contract

**Date:** 2026-08-15  
**Status:** Approved for safe implementation; external Meta approval remains owner-controlled.

## 1. Facebook Login for Business configuration contract

NexaReply will support a server-only optional `META_LOGIN_CONFIG_ID` value. The platform owner creates the Facebook Login for Business configuration in Meta Dashboard and chooses the exact asset set, token type, and permissions there. The application never hard-codes a configuration ID and never exposes it in a browser DTO.

| Runtime condition | Authorization URL behavior | Reason |
| --- | --- | --- |
| `META_LOGIN_CONFIG_ID` configured | Include `config_id`, `response_type=code`, state, client ID and redirect URI. Do **not** append a competing generic `scope` list. | The Meta Business Login configuration is the owner-created source of truth for assets and permissions. |
| `META_LOGIN_CONFIG_ID` absent | Preserve the current authorization-code flow and the existing scope set while the System User fallback remains. | Backward-compatible development/pilot behavior; avoid silently breaking existing authorized flows. |

The code must report safe configuration readiness only. A missing configuration ID is not a browser error or secret disclosure; it means the owner must create and enter the matching Meta configuration before relying on config-based production onboarding.

## 2. Permission decision

The System User fallback remains in this iteration. It is used only when direct `/me/accounts` discovery returns no Page candidates and the OAuth result supplies a client business ID. Consequently, the generic compatibility path retains `business_management` and its dependent permissions. The final config-based production configuration must include `business_management` only if its configured token type/flow also requires the System User fallback.

The direct Page-owner path itself is limited to `pages_show_list`, `pages_manage_metadata`, and `pages_messaging`. No code may add `pages_utility_messaging`, engagement read, advertising, or catalog permissions unless a separately implemented feature requires them and is documented/reviewed.

## 3. Customer connection flow

1. An organization owner selects **Facebook-ის დაკავშირება**.
2. NexaReply creates a short-lived owner/org-scoped OAuth session and redirects to Facebook Login for Business.
3. Meta returns to the server callback; the code exchange, candidate discovery, and staged encrypted credentials remain server-side.
4. If exactly one returned Page has a staged credential, NexaReply automatically performs the subscription verification and connects it.
5. If multiple usable Pages return, NexaReply presents a compact Page picker showing Page name and generated visual identity only; Page ID is not a primary UI element.
6. A connection is declared successful only after the selected Page subscription succeeds, the encrypted tenant vault is written, status is persisted, and staged credentials are removed.

## 4. Manual and lifecycle controls

Manual Page ID/token entry is support/development-only. The server and UI require `ENABLE_META_MANUAL_SETUP=true`; the production default is false. When disabled, no manual mutation is exposed and no Page token form is rendered.

Owner connection management gains a disconnect action. Disconnect marks the tenant connection disabled, clears the tenant vault credential and staged OAuth credentials, and blocks future sends because the connection is no longer `connected`. Historical conversations remain intact. A new OAuth authorization is the reconnect path.

The public `/data-deletion` instructions route remains human-readable. A separate server route will handle Meta's signed deletion callback, validate HMAC-SHA256 signed requests with the App Secret, create a non-secret confirmation code/audit record, and return Meta's required JSON `{ url, confirmation_code }` response. It will not accept arbitrary unsigned requests.

## 5. Deferred owner actions

The following cannot be implemented or bypassed in source code: creating the actual Meta configuration and providing its ID, Business Verification, potential Access Verification/Tech Provider classification, Advanced Access/App Review, screencast submission, reviewer credentials, approval, and Live availability. No external-account production claim is allowed before those actions and the non-admin acceptance test pass.

## References

See [Official Meta research](./meta_onboarding_official_research_2026-08-15.md) and [Phase 0 audit](./meta_onboarding_phase0_audit_2026-08-15.md).
