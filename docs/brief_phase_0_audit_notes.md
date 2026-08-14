# NexaReply Master Brief — Phase 0 Audit Notes

## Source material read in full

The following Markdown files from `/home/ubuntu/nexareply_brief_2026-08-14/` were read before implementation planning:

1. `00_README_GE.md`
2. `01_CURRENT_STATE_AND_PRODUCT_DIRECTION_GE.md`
3. `02_MASTER_MANUS_PROMPT_EN.md` — source of truth
4. `03_FEATURE_BACKLOG_AND_ACCEPTANCE_GE.md`
5. `04_SECURITY_DATA_AND_INTEGRATION_RULES.md`
6. `05_REFERENCE_MAP.md`

The bundled visual references are pattern-only material. NexaReply must remain an original Georgian-first product; no Alita brand, copy, endpoint, visual identity, token, or credential is to be copied.

## Non-negotiable production boundaries

- Preserve the live **Amadeo · ამადეო** Meta Messenger connection, Page association, webhook endpoint, current managed credentials, and existing persistent data.
- Never rotate, recreate, expose, log, export, or move Meta/provider secrets into browser code or database plaintext.
- Every new API, migration, upload, retrieval, job, import, and UI action must be organization-scoped and server-authorized.
- Public Demo Mode remains isolated from live Amadeo data.
- Do not label unavailable providers, payment collection, durable automation, or synthetic real-workspace data as live.

## Current audited implementation facts

| Area | Existing capability | Phase 1–2 gap / safe direction |
|---|---|---|
| Meta connection | `server/metaMessengerService.ts` uses server environment credentials only, persists safe Page metadata/status, verifies GET challenge and POST HMAC, deduplicates inbound events, and sends only by an explicit authenticated action. | Keep the path untouched; redesign may consume only its safe `getConnectionStatus` DTO. Smoke checks must be read-safe and must not re-authorize, disconnect, rotate, or send customer messages. |
| Worker setup | `background_jobs` has durable-record semantics, and `server/jobWorker.ts` can process due conversation jobs. | Autoscale runtime still has no deployed durable scheduler/worker guarantee; UI must expose truthful readiness and never promise a production-guaranteed 10-second debounce. |
| Catalog | Products, variants, CSV/XLSX import preview/commit, CSV export, owner/operator authorization, and tenant-scoped repository flows already exist. | Add product assets/gallery, approved/draft state, richer editor data, secure storage-backed upload, and natural-language draft/approval without breaking existing catalog rows or imports. |
| Knowledge | Tenant-scoped active facts and minimal document metadata are persisted; AI currently uses active facts. | Add source/draft/approval/version semantics while ensuring unapproved facts cannot enter production AI grounding. |
| Workspace UI | Protected shell has real Overview, Inbox, Catalog, Knowledge, Assistant, Tickets, Analytics, Alerts, Members, and Integrations screens. | Build an original light-first design system, grouped responsive navigation/drawer, useful zero states, real onboarding checklist, and status UX without introducing placeholders or fake metrics. |

## Phase 1–2 implementation intent

**Phase 1** will introduce a tokenized original NexaReply Operations OS visual system, light/dark/system support, responsive grouped navigation, an actionable real-data overview, and organization-persisted onboarding that links to real setup steps.

**Phase 2** will implement two safe slices: a secure, organization-scoped multi-photo catalog using object storage and an approval-first natural-language business-knowledge composer. The photo/catalog and knowledge draft tables will be added through backwards-compatible migrations; existing Amadeo products, facts, imports, conversations, and Meta records will remain intact.

## Validation contract for every release

Each phase requires TypeScript, Vitest, production build, desktop/mobile visual QA, keyboard/accessibility smoke checks, and a read-safe Amadeo Meta status check. Release notes must identify changed files, migration impact, functionality that is live, demo-only behavior, and remaining infrastructure prerequisites.

## Baseline validation — 2026-08-14

`pnpm check && pnpm test && pnpm build` passed before any Phase 1–2 implementation work. Vitest reported 57 passed tests with 2 managed-secret integration tests intentionally skipped. The production build passed with an existing large-chunk advisory for the analytics/vendor output.

A browser-based, read-safe visit to the live authenticated Amadeo overview confirmed the owner workspace loads and reports **Amadeo ⋅ ამადეო** as connected with webhook subscription status. The workspace rendered 2 persistent conversations, 1 open ticket, 1 AI reply, and 1 human reply at the time of the check. No OAuth action, credential operation, Page selection, connection mutation, or outbound message was triggered.

## Phase 1 release QA note

The initial post-checkpoint browser visit continued to serve the prior protected-workspace bundle, while still confirming the existing Amadeo connection and operational counts are intact. No Phase 1 visual QA conclusion is recorded until the new deployed bundle is observed; no integration action was performed during this check.

A subsequent hard refresh still rendered the prior navigation/header/overview presentation. This is treated as deployment propagation or cached-runtime verification work, not as an invitation to alter the live Meta connection. The browser confirmed the same safe connected Page status and did not perform a mutation.

Once the publish pipeline completed, live desktop QA confirmed the new Phase 1 experience: grouped workspace rail, Light/Dark/System selector, owner-ready onboarding checklist with real 2/5 completion state, actionable links to catalog/knowledge/assistant/inbox, and the explicit worker-readiness limitation. The same read-only screen continued to show **Amadeo ⋅ ამადეო** with a connected webhook subscription. No OAuth, Page-selection, credential, checklist mutation, or outbound-message action was used during QA.

The mobile layout is regression-tested for a separate `lg:hidden` drawer trigger and `lg:flex` desktop rail, and a managed-preview 375px capture confirmed the protected entry state has no viewport overflow. The preview environment is not authenticated as the live Amadeo owner, so direct 375px inspection of the owner-only drawer was not performed there; the published authenticated workspace was visually verified on desktop and the mobile shell contract is covered by rendering tests.
