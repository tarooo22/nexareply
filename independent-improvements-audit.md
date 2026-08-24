# NexaReply — Independent Performance, UI/UX and Billing-Design Audit

**Audit date:** 2026-08-24

## Confirmed performance opportunity

`DemoWorkspace` and `AuthenticatedWorkspace` are already lazy loaded, but `PublicPage`, `InvitationAccept`, `AuthPage` and `NotFound` remain part of the initial client graph even though only one route is rendered. Safely convert those route modules to `React.lazy`; keep the public Home route eager as the landing route and retain the existing route-level `Suspense` fallback. This does not change tRPC, session or authorization behavior.

## Confirmed UI/UX and billing-design opportunity

The Settings plan card already uses server-derived entitlement status, automation state, channels, member limits, quota and trial date. The remaining independent UI design task is a dedicated owner-facing upgrade information surface that clearly communicates provider-free status and routes owners to an information dialog instead of a fake checkout. No price, checkout, payment record or subscription claim will be fabricated.

## Guardrails

All changes remain client-only except existing server entitlement reads. Meta connections, OAuth, queue jobs, managed secrets and active Page state are out of scope.

## Implemented results and validation

`PublicPage`, `InvitationAccept`, `AuthPage` and `NotFound` now load as separate route chunks behind the existing `Suspense` boundary. The initial JavaScript chunk dropped from **774.5 kB to 728.1 kB** before gzip; public/auth route chunks now load only on demand. A dedicated regression test protects this route-loading contract.

Settings now includes an accessible, provider-free “Upgrade readiness” disclosure. It presents only server-derived reply quota, channel and member limits, and states that neither checkout nor a payment provider is active. Desktop and 375px mobile smoke checks passed for Home, pricing and auth routes. The full gate passed with TypeScript, 122 Vitest tests and 2 managed-secret integration tests intentionally skipped, plus a production build. The remaining build advisory applies to the still-large primary and authenticated workspace chunks and can be addressed in a later deeper component-level split.
