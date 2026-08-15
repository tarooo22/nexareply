# Fresh vs Returning Meta Authorization Flow Audit

**Date:** 2026-08-15  
**Scope:** Read-only comparison. No authorization URL, Meta App configuration, token, connection, webhook, source code, or browser login state was changed.

## Key interpretation

The observed message — **“You've previously linked Automated Messenger to Facebook. Would you like to continue with your previous settings?”** — is a Meta-controlled returning-authorization experience. It is not evidence that NexaReply’s customer-facing wizard failed to implement a fresh-user flow. A returning person already has an app authorization/configuration history, so Meta may offer the previously granted setup instead of presenting the complete first-consent sequence again.

## Current NexaReply behavior

| Step | Current implementation |
| --- | --- |
| Start | Owner clicks the Georgian Facebook connection CTA; server creates a random, short-lived, owner/org-scoped state session. |
| Authorization URL | `https://www.facebook.com/v24.0/dialog/oauth` with `client_id`, exact redirect URI, `response_type=code`, state, and the existing generic scope set. |
| Callback | Server validates opaque state, exchanges authorization code server-side, and never returns provider/Page credentials to the browser. |
| Candidate discovery | Server calls `/me/accounts?fields=id,name,access_token,tasks`; if empty, it invokes the documented current System User fallback. |
| NexaReply Page choice | The current wizard displays a picker for all returned Pages, including when exactly one candidate exists. |
| Connection completion | The selected Page is subscribed through `/{page-id}/subscribed_apps`; only then is encrypted tenant Page credential persisted and status set to connected. |

## Official fresh-user sequence

Meta documents Facebook Login for Business as a Dashboard-created **configuration** that defines token type, requested assets, and permissions. During login, the app user is presented with that configuration and grants access to business assets. [1]

For a fresh App Tester/Developer who has never authorized the app, the anticipated **conceptual** sequence is:

1. NexaReply opens Facebook Login for Business.
2. Meta authenticates or confirms the person; the first visible screen can show only basic identity/app context, including name/profile information.
3. Meta presents requested permissions and, for granular Page/business permissions, lets the person select or limit the assets/Pages it may access.
4. Meta redirects with an authorization code after approval.
5. NexaReply server discovers the granted Pages, subscribes the Page webhook, writes tenant-scoped encrypted credentials, and reports connected.

The exact visual wording, number of screens, account switcher, and asset-selection layout are controlled by Meta and may vary by account, app state, configuration, region, and prior authorization history. Meta’s documentation confirms that Page/business permissions are granular and that people can grant a subset of requested permissions/assets; it does not guarantee a fixed screen order or a specific first-dialog string. [2]

## Returning-user sequence

For an already-authorized person, Meta can offer prior settings. The user may choose **Continue with previous settings**, or Meta may prompt for additional/changed access when the authorization configuration/scopes differ. NexaReply must keep this supported; the existing callback, server-side Page discovery and tenant-bound subscription still run after Meta returns a code.

## Comparison to observable Alita flow

| Question | Audit conclusion |
| --- | --- |
| Is a basic identity screen before asset selection abnormal? | No. Meta can stage authentication, general app consent, permission grants, and granular asset choice across multiple provider-controlled screens. |
| Can Page/business asset selection happen inside Meta? | Yes, Meta documents granular Page and business-asset permissions. The exact UI is Meta-controlled. [1] [2] |
| Does current generic scope flow guarantee Meta asset selection? | No. The current code uses generic OAuth scopes. A Facebook Login for Business `config_id` is the documented way to make the owner-created asset/permission configuration the source of truth. [1] |
| Can NexaReply eliminate its second Page picker entirely? | Not safely in all cases. Meta may grant multiple Pages or return candidates through `/me/accounts`; NexaReply needs server-side verification before persisting a connection. It can **auto-connect exactly one usable staged Page** and show a compact picker only for multiple returned candidates. |
| Does the observed returning screen prove a current NexaReply UX bug? | No. It is expected Meta returning-user behavior. |

## `META_LOGIN_CONFIG_ID` finding

A config ID is recommended for the intended production Facebook Login for Business architecture after the platform owner creates the configuration in Meta Dashboard with the final token type, Page/business asset behavior, and minimized permissions. It is not required merely to make the existing generic OAuth flow function, and it must not be guessed or hard-coded. No config ID was added or used during this audit.

## Required fresh-user test

A real test requires a Facebook account that is an authorized **App Tester or Developer**, has never authorized this Meta app, and has Facebook access with full control to a separate Page. The safe observation checklist is:

`Connect Facebook → Meta initial consent → granular business/Page permission selection if shown → callback → server Page discovery → automatic single-Page connection or compact multi-Page picker → webhook subscription → connected state.`

This test must not log or capture user/Page access tokens. It is distinct from the final external non-admin production acceptance test, which cannot occur until Meta approval and Live availability are complete.

## References

[1] [Meta — Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)  
[2] [Meta — Permissions with Facebook Login](https://developers.facebook.com/documentation/facebook-login/guides/permissions)  
[3] [Meta — Permissions Reference](https://developers.facebook.com/docs/permissions/)
