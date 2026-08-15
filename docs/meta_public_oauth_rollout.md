# Meta Public OAuth Rollout — Current Evidence and Required Actions

**Audit date:** 2026-08-15  
**Existing App:** Automated Messenger (existing app; do not replace it)  
**Safety boundary:** Do not rotate the App secret, client token, Meta verify token, managed Amadeo Page token, or webhook callback while completing the checklist.

## Screenshot-verified state

| Area | Current evidence | Meaning |
| --- | --- | --- |
| Existing App access | The user opened the existing Automated Messenger Meta App Dashboard. | The correct App owner/admin account is now available. |
| Products | Messenger, Webhooks and Facebook Login for Business are present. | No replacement App is needed. |
| Webhook | Existing NexaReply callback URL is registered. | Preserve the current callback and verify token. |
| App Basic policy fields | Privacy points to NexaReply; Terms and Data Deletion Instructions were temporary Facebook.com values during the audit. | Update the two temporary URLs to NexaReply public pages. |
| Business portfolio | The portfolio is shown as Unverified. | Business Verification is the next owner-controlled prerequisite. |
| Access Verification | Meta displays it as unavailable until Business Verification completes. | Do not submit Access Verification before Business Verification. |
| External OAuth | A non-owner account displayed Facebook Login “Feature unavailable.” | The App is not yet public-ready for broad self-service use. |

## Exact owner action sequence

1. In **App settings → Basic**, set **Terms of Service URL** to `https://nexareply-2chxuc4s.manus.space/terms`.
2. In **User data deletion**, choose **Data deletion instructions URL** and set it to `https://nexareply-2chxuc4s.manus.space/data-deletion`.
3. Save those fields. Do not change App secret, Client token, webhook callback, verify token, or existing Messenger subscription.
4. In the existing business portfolio, begin and complete **Business Verification** with the legal/business information Meta requests. This is an owner action; credentials and documents must remain with the owner.
5. When Business Verification is complete, review and submit the now-available **Access Verification** if Meta requires it.
6. Review every permission requested for the existing Facebook Login for Business and Messenger workflow. Request any Meta review/advanced access that the dashboard requires for `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, and `pages_messaging`.
7. Only when the dashboard reports the requirements complete, confirm the App’s public/Live availability according to Meta’s final confirmation dialog.
8. Use a Facebook account that is neither the App admin nor a tester to run the NexaReply OAuth flow. That user needs Facebook access with full control of the selected Page. Confirm that only the user’s own Page is shown and no Page token is exposed.

## Rollout truthfulness

Until steps 4–8 are completed and a non-owner retest succeeds, NexaReply must not claim that any arbitrary Facebook user can connect a Page. The Page OAuth UI, encrypted per-organization vault and token boundary are implemented; the outstanding blocker is Meta’s App/business approval state, not the NexaReply client flow.
