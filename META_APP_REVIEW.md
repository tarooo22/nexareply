# NexaReply Meta App Review and Test Scope

## Current status

NexaReply’s safe code path is implemented and tested with the existing generic OAuth fallback. `META_LOGIN_CONFIG_ID` is intentionally empty. Therefore the current flow is for Meta App Admin/Developer/Tester testing only; it must not be represented as production-ready for unrelated external Facebook accounts.

## Reviewer flow

The reviewer should use an authorized Meta App Tester/Developer account with Facebook access with Full control to a test Page. In NexaReply, the reviewer signs in, opens **ინტეგრაციები → Meta Messenger**, and selects **Facebook-ით ავტორიზაცია**. Meta may show a fresh consent/asset flow or a returning-user “Continue with previous settings” flow. Both are provider-controlled outcomes.

After callback, NexaReply resolves the returned Pages server-side. One usable Page is automatically validated and connected; multiple usable Pages remain in a compact picker. Connection is only successful after Page identity verification, server-side token usability, `subscribed_apps` success, and encrypted tenant-vault persistence.

## Permission rationale

| Permission | Product use in the current code |
|---|---|
| `pages_show_list` | Discover Pages returned to the authorized owner through `/me/accounts`. |
| `pages_manage_metadata` | Validate and subscribe the selected Page through `/{page-id}/subscribed_apps`. |
| `pages_messaging` | Send Messenger replies through `/{page-id}/messages`. |
| `pages_read_engagement` | The direct current OAuth/manual connection flow does not request Page content, insights, followers, or metadata by `/{page-id}` lookup. Do not request it unless Meta later documents it as a necessary dependency for a separately retained fallback. |
| `business_management` | Used only by the current optional System User fallback path when `/me/accounts` is empty and Meta exposes a client business token path. It is not evidence that every direct Page-owner flow needs this permission. |

## Reviewer evidence and privacy boundary

The reviewer should verify that no Page token, App Secret, Verify Token, authorization code, encrypted vault ciphertext, or raw provider payload is displayed in the browser. The visible result should contain only Page name, non-sensitive connection status, webhook status, and recovery instructions.

Do not record or submit real customer conversations, real Page tokens, or personal identity documents in a screencast. Use only a designated test Page and role-based test account.

## Owner-side prerequisites still pending

The owner must complete Business Verification where Meta requires it, request/obtain Advanced Access or App Review for permissions intended for external users, configure the final Facebook Login for Business Configuration ID if using that architecture, set the app to the required Live/Public state, and perform a fresh external non-role account retest. NexaReply does not claim these Meta-side approvals are complete.

## Lifecycle callback URLs

Use `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/deauthorize` for the deauthorization callback and `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/data-deletion` for the Data Deletion Request URL. Both endpoints require Meta's signed request. The callback returns a confirmation handoff; it does not silently delete a tenant without a verified organization mapping.
