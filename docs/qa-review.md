# NexaReply QA review

## Persistent foundation update

The Demo workspace is now backed by the managed MySQL/TiDB database rather than browser-only fixtures for Inbox, Products, Knowledge Base, Leads, Draft Orders, Notifications, and Analytics. The applied migration introduces organization-scoped entities, persistent TechZone seed data, repository/service boundaries, protected OAuth workspace bootstrap, server-side Demo AI, CSV/XLSX validation and real CSV downloads. The public Demo remains deliberately separate from authenticated `/app` access.

| Verification area | Result | Evidence |
|---|---|---|
| Schema and managed migration | Passed | 21 persistent organization-scoped tables created through the managed SQL migration workflow. |
| Persistence seed | Passed | TechZone catalog, knowledge, conversations, messages, leads, and draft orders are present in the managed database. |
| TypeScript compilation | Passed | `pnpm check` completed without errors after persistent UI/API changes. |
| Unit and router-level tests | Passed | `pnpm test`: 5 test files and 10 tests passed, including import validation, AI safety, and owner-only router denials. |
| Production build | Passed with advisory | `pnpm build` succeeded; the existing main-chunk size advisory remains documented below. |
| Persistent Analytics | Passed | Browser verification confirmed DB-derived response, AI/human, lead, handoff, funnel, and daily volume metrics. |

## Scope verified

NexaReply provides a Georgian-first public marketing experience and an unauthenticated TechZone Demo workspace. The demo covers an organization switcher, owner/operator navigation behavior, threaded Messenger-style conversations, deterministic AI drafts, editable approval/send interactions, human takeover, ticket escalation, product and knowledge views, contacts and draft orders, notifications, onboarding, and analytics.

| Verification area | Result | Evidence |
|---|---|---|
| TypeScript compilation | Passed | `pnpm check` completed without errors |
| Unit tests | Passed | `pnpm test`: 9 test files and 16 tests passed at the final persistent-foundation verification. |
| Public marketing page | Passed | Desktop and mobile visual review completed |
| Demo responsive shell | Passed | Mobile review completed for Inbox, Leads, and Analytics |
| AI safety fallback | Passed | Unit coverage confirms an unknown fact receives an escalation fallback rather than a fabricated answer |
| Human takeover | Passed | Unit coverage and Demo state block AI drafts while a human owns the thread |

## Interaction checks

The Inbox exposes a visible Demo action to append an inbound message, waits through a shortened preview of the configured debounce rule, then generates a deterministic catalog-backed draft. The user can change tone, edit the draft, approve it, and send it to the demo thread. Unknown information surfaces a ticket flow, with an idempotent owner-event key. Human takeover pauses AI draft behavior and writes a system event into the thread.

Contacts and products support debounced query filtering. The catalog import and contact export flows clearly identify their non-persistent Demo behavior. The owner notification screen presents in-app demonstration states only and does not send email, Telegram, or external API traffic.

## Accessibility and responsive checks

The interface uses semantic buttons and labels for interactive controls, visible keyboard focus treatment, minimum-height action targets, dark-theme variable pairs, and reduced-motion CSS. On mobile, the workspace collapses to a menu-first shell. The Inbox starts with the conversation list and exposes a return path from the selected thread. Tables remain horizontally scrollable where a compact card representation would lose too much comparison context.

## Performance validation

The final production build completed successfully in **3.25 seconds**. The compiled JavaScript assets were approximately **759 KB** (main, **217 KB gzip**), **211 KB** (Demo workspace, **28 KB gzip**), and **410 KB** (Analytics, **113 KB gzip**). This prevents Recharts and analytics visualization code from loading with normal Demo Inbox, Leads, Products, or Settings navigation.

Local route-serving checks returned HTTP 200 for `/demo/conversations` with **0.003634 s** TTFB and **0.003711 s** total time, and for `/demo/analytics` with **0.003916 s** TTFB and **0.003982 s** total time. These values measure SPA document serving rather than client-side JavaScript execution; the route-specific chunks are covered by build inspection and final visual route checks. For the current static Demo workload, the heaviest interactive view renders a seven-point chart and fewer than ten demo records, and the mobile/desktop visual checks completed without a rendering failure.

The bundler still reports a large-chunk advisory for the approximately 736 KB main asset. This is a documented non-blocking limitation of the starter stack and should be further split through vendor/manual chunks after production route analytics identify the highest-impact dependency group.

## Final visual verification

The public home page and Demo overview were rechecked after the final brand update. The logo now uses a violet-to-cyan conversation mark with a reply-trail indicator, matching the visual direction documented in `ideas.md`. The remaining stylistic recommendation to reduce uniform card surfaces is intentionally deferred: those surfaces currently preserve clear grouping and mobile readability for the demo data density.

## Production-readiness boundary

The current build now has a persistent data foundation, but it still does **not** connect to Facebook/Meta, Telegram, an external OpenAI account, email, or real customer accounts. The server-side adapter and `docs/integration-contracts.md` establish a secret-safe implementation seam for a future production rollout. Managed secrets, Meta signature verification, outbound delivery retry policy, and external notification configuration remain required.

The `background_jobs` table, dedupe keys, and worker adapter are implemented; however, the current autoscaling request runtime does not guarantee a continuously running worker. Therefore, a ten-second debounce timestamp can be persisted but **is not production-durable** until a dedicated durable worker/scheduler hosting configuration is provisioned and validated.
