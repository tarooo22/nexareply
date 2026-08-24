# NexaReply — Phase 2 Onboarding and Membership Audit

**Audit date:** 2026-08-24  
**Scope:** Fresh authenticated user flow, organization creation/selection, membership/invitation lifecycle UI, and per-organization Meta connection readiness.  
**Protected boundary:** Existing Khavsi Meta connection and all managed secrets are excluded from mutation in this phase.

## Confirmed server foundations

| Contract | Verified behavior |
|---|---|
| Organization creation | `createSelfServiceOrganization()` creates an organization, owner membership, starter-trial subscription, onboarding record, and unconfigured integration records in one transaction. |
| Tenant access | Workspace scope is derived from authenticated membership; UI organization selection does not grant any unverified organization access. |
| Invitations | Invitation DTOs already include lifecycle and delivery states. The service supports create, cancel, resend, expiry, matching-email acceptance, and manual-link fallback. |
| Meta boundary | Only the organization owner can reach the connection wizard. The wizard reports role-user test mode and App Review/Live limitations without exposing an App-level Verify Token. |

## Confirmed Phase 2 gaps

| Priority | Gap | Impact | Phase 2 repair |
|---|---|---|---|
| High | `AuthenticatedWorkspace` automatically calls `bootstrap` when a fresh user has no workspace. | It creates a generic workspace before the user chooses a business name and can cause an unwanted second workspace when the user then uses “ახალი workspace”. |
| High | The organizations query has no explicit error state and an empty authenticated result has no deliberate workspace-creation state. | A failed load can present an empty shell; the first user cannot understand or recover the onboarding state. |
| High | The Members panel shows only a pending-invitation count and optional link. | Existing server-supported sent/manual-ready/failed/expired/cancelled states, resend and cancel actions are hidden from owners. |
| Medium | Member role changes have no visible pending, success, or error feedback. | An owner cannot tell whether a membership mutation completed; the server must remain authoritative for self-demotion protection. |
| Medium | Organization listing has no explicit ordering. | Default selection can be non-deterministic across database plans and sessions. |

## Implementation boundaries

The repair will preserve the existing server-side organization/membership checks, use only owner-protected invitation procedures, show manual invitation links only when the server explicitly returns one, and leave public Meta OAuth approval requirements unchanged. The fresh-user screen will create a named workspace through the existing protected mutation rather than introducing any client-side organization state.

## Validation outcome

The Phase 2 UI regression suite verifies three essential contracts: owner/operator navigation remains driven by persisted membership, a fresh authenticated user receives an explicit named-workspace creation screen instead of an automatic generic bootstrap, and invitation lifecycle/actions render without credential-shaped provider data. Existing Meta service, OAuth, webhook, tenant-isolation, invitation-service, and authorization tests remain green.

The full quality gate passed: TypeScript, 119 passing Vitest tests with 2 managed-secret integration tests intentionally skipped, and the production build. Desktop and 375px mobile smoke checks passed for Home, Demo and the unauthenticated protected-workspace entry. An authenticated live-browser fresh-user smoke requires a deliberately created test account and is therefore not fabricated during this production-data-safe QA pass.
