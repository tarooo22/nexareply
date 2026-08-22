# Meta rollout findings — 2026-08-22

## Official access-levels finding

Meta's official Access Levels documentation states that Standard Access is restricted to app users who have a role on the app, while Advanced Access is needed when permissions or features must work for users without an app role. The same documentation states that Advanced Access is approved per permission/feature through App Review and that advanced access may require the app to be connected to a verified business. Source: https://developers.facebook.com/docs/graph-api/overview/access-levels/

## NexaReply implication

The current generic OAuth fallback remains suitable for App Admin/Developer/Tester testing only. To support unrelated external Facebook accounts, the owner must complete the relevant Meta business verification and request/obtain Advanced Access/App Review for the permissions actually used by the public flow, then enable the final public/Live configuration and retest with a non-role account. No project secret, active Khavsi connection, or code path was changed during this research step.

## Official App Review finding

Meta's current App Review submission guide says reviewers must be able to access the app and follow the submitted screen recordings. Each requested permission or feature needs a recording that shows the app user granting it and the product behavior that uses it; missing evidence can prevent approval. The guide also recommends high-resolution recordings and captions/tooltips when the app is not in English, and says the app should be ready and accessible before submission. Source: https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review/submission-guide

## NexaReply implication

The owner should prepare an English-captioned reviewer video using a test account and test Page, showing Facebook authorization, Page selection, webhook-connected state, inbound Messenger event, evidence-grounded AI draft, operator takeover, and outbound reply. Do not include live customer data, Page tokens, App Secret, Verify Token, authorization codes, or raw provider payloads. The active Khavsi connection remains unchanged.


## Official Business Verification finding

Meta's Business Verification documentation states that apps requesting Advanced Access, and apps that allow other businesses to access their own data, must be connected to a Business that has completed Business Verification. Until that is complete, users from other businesses cannot grant the app the relevant permissions and features remain inactive. Meta also states that an app administrator can connect the app to a Business, but only a Business administrator can complete the verification process. Source: https://developers.facebook.com/documentation/development/release/business-verification

## Current session configuration audit

A read-only session configuration inspection found no enabled Meta developer connector that should be used for the NexaReply rollout. No connector was enabled or modified. The application continues to rely on its managed server-side Meta settings and existing project integration.

## Confirmed owner-dependent blockers

The project TODO still identifies the following as owner-controlled: Business Verification, permission/App Review submission for public access, a full external non-role OAuth/Page-selection retest after Meta changes, and Verify Token rotation. These are not safe to complete autonomously without the owner's Meta Dashboard access and explicit confirmation at each sensitive step.
