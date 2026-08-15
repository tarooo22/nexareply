# Official Meta Research — NexaReply Messenger Onboarding

**Date:** 2026-08-15  
**Scope:** Current official Meta developer documentation only. This document records research findings; it makes no Meta Dashboard or source-code change.

## Facebook Login for Business Configuration (`config_id`)

Meta documents Facebook Login for Business as a Dashboard-configured login experience: the platform owner selects the access-token type, business assets, and permissions and saves that combination as a **configuration**. The resulting **Configuration ID** identifies that setup in a login dialog. Meta's documented guidance is to use `config_id` for a Business Login configuration rather than independently assembling a divergent client-side permission request when the configuration is the source of truth. [1]

For NexaReply, a managed, server-only `META_LOGIN_CONFIG_ID` is appropriate **only after** the platform owner has created the matching Facebook Login for Business configuration. The configuration must mirror NexaReply's final token type, asset selection, and minimized permissions. An unset variable must preserve the existing compatibility behavior and clearly report unconfigured configuration rather than hard-code an ID.

## Permission and endpoint findings

| Permission | Official finding | NexaReply relevance |
| --- | --- | --- |
| `pages_show_list` | Allows access to the list of Pages managed by a person. [2] | Direct Page discovery through `/me/accounts`. |
| `pages_manage_metadata` | Allows a Page app to subscribe/receive Page webhooks and update Page settings. [2] | `POST /{page-id}/subscribed_apps` for Messenger events. |
| `pages_messaging` | Allows Page Messenger conversation access/management; it depends on `pages_manage_metadata` and `pages_show_list`. [2] | Inbound Messenger workflow and `POST /{page-id}/messages`. |
| `pages_read_engagement` | Reads Page content, follower/profile metadata, and Page insights. [2] | Not directly used by current direct Page-list, webhook, or reply operations; potentially indirect if Business Manager System User fallback remains. |
| `business_management` | Allows Business Manager API read/write and is explicitly required for `/{CLIENT_BUSINESS_ID}/system_user_access_tokens`. [1] [2] | Required only by current optional System User fallback; not by the normal direct Page-owner flow. |

## Pages and Messenger requirements

Meta's Pages API documentation lists Facebook Login for Business Page permissions including `pages_manage_metadata`, `pages_read_engagement`, and `pages_show_list`, and states that `business_management` is required when a business system user makes API requests. [3] Meta's Messenger Send API requires a Page ID, recipient ID, Page access token, recipient permission, message type, and content; it does not expose a reason to use a global tenant-shared credential. [4]

## App Review and owner actions

Meta's Permissions Reference states that apps should request only permissions needed for their implemented functionality, that Advanced Access requires Business Verification, and that access to data managed by other businesses may require App Review. [2] Screen-recording guidance requires demonstrating each permission and feature submitted for review. [5]

## Research conclusion

The final one-click production configuration should be designed first, then created by the platform owner in Meta Dashboard. Code cannot create, approve, or publish a Facebook Login for Business configuration, Business Verification, Access Verification, Advanced Access, App Review, or Live mode. NexaReply can safely add managed configuration support, minimized scope handling, customer UX, and tests while these owner-side steps are pending.

## References

[1] [Meta — Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)  
[2] [Meta — Permissions Reference](https://developers.facebook.com/docs/permissions/)  
[3] [Meta — Pages API: Manage a Page](https://developers.facebook.com/documentation/pages-api/manage-pages)  
[4] [Meta — Messenger Platform: Send a Message](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages)  
[5] [Meta — App Review Screen Recordings](https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/)
