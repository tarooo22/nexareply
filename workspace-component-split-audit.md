# NexaReply — Authenticated Workspace Component-Splitting Audit

**Audit date:** 2026-08-24

## Implemented boundary

The authenticated workspace shell previously eagerly imported every operational screen from `AmadeoWorkspaceScreens`. It now resolves those named exports through one lazy-loaded operational-screen module and renders them inside a screen-local `Suspense` boundary. The shell keeps its own authentication checks, workspace-scope query, organization switcher, owner-only controls, mobile navigation and queue panel eager; therefore tenant scope and access behavior are unchanged.

## Build result

The authenticated shell chunk reduced from **458.8 kB to 241.2 kB** before gzip. The operational screen module now loads on first selected workspace screen at **232.1 kB** before gzip. Home remains untouched, and no Meta/Page/token or backend workflow changed.

## Follow-up

The primary bundle remains above the warning threshold, predominantly because shared vendor/UI dependencies are still bundled together. A deeper split would require coordinated Vite manual chunks and needs separate regression profiling; it is intentionally deferred from this safe route/component boundary increment.

## Validation outcome

The protected `/app` entry remains correctly gated for an unauthenticated browser. TypeScript passed, the workspace lazy-loading/navigation/auth-boundary regression suite passed, and the complete quality gate passed with 123 Vitest tests and 2 managed-secret integration tests intentionally skipped. Production build confirms the new `AuthenticatedWorkspace` and `AmadeoWorkspaceScreens` boundaries. No external integration or managed secret changed.
