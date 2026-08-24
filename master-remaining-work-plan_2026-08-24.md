# NexaReply — დარჩენილი სამუშაოების Master Plan

**თარიღი:** 2026-08-24

**სტატუსი:** დამტკიცებულია — მიმდინარეობს Phase 1: production baseline და truthful self-service readiness repair.

**მიზანი:** NexaReply გახდეს production-ready, Georgian-first, multi-tenant AI sales workspace, სადაც ნებისმიერი უფლებამოსილი merchant შეძლებს საკუთარი workspace-ის შექმნას, საკუთარი Meta Page-ის OAuth-ით დაკავშირებას, პროდუქტისა და ცოდნის დამატებას, Messenger Inbox-ის მართვას, AI automation-ის უსაფრთხოდ გამოყენებას და plan/usage წესების server-side კონტროლს.

> **ძირითადი უსაფრთხოების წესი:** მოქმედი Khavsi Meta connection, Page credentials, App Secret, Verify Token და სხვა managed secrets არ შეიცვლება, არ გამოჩნდება browser-ში, log-ში, screenshot-ში, test fixture-ში ან Chat-ში, გარდა ცალკე owner-approved rotation-ისა.

## 1. მიმდინარე მდგომარეობა და დარჩენილი scope

NexaReply უკვე შეიცავს React 19 + Tailwind 4 + tRPC 11 + Express + Drizzle/MySQL/TiDB საფუძველს, multi-tenant მონაცემთა მოდელის ნაწილს, encrypted Meta vault-ს, webhook signature validation-ს, idempotent inbound persistence-ს, Inbox-ს, catalog/knowledge/assistant/tickets/analytics UI-ს, owner-only manual Meta flow-ს, OAuth fallback-ს და button audit-ის წარმატებულ checkpoint-ს. ბოლო ცნობილ QA მდგომარეობაში TypeScript და production build გაიარა, 118 Vitest ტესტი გაიარა და ორი managed-secret ტესტი განზრახ skipped დარჩა.

მოქმედი Meta მდგომარეობა ასეთია: Khavsi-ის connection შენარჩუნებულია და live inbound event უსაფრთხოდ დადასტურებულია; `META_LOGIN_CONFIG_ID` ცარიელია; generic OAuth fallback ჯერ მხოლოდ App Admin/Developer/Tester როლებისთვის არის განკუთვნილი; manual Page ID + Page Access Token flow owner-gated არის. ამიტომ უცხო, App role-ის არმქონე Facebook account-ის self-service connection ჯერ არ უნდა გამოცხადდეს production-ready ფუნქციად. Business Verification, Advanced Access/App Review, Live/Public რეჟიმი, external-account retest და Verify Token rotation owner-dependent დარჩა.

| კატეგორია | უკვე არსებული საფუძველი | რაც რეალურად დარჩა |
|---|---|---|
| Identity და workspace | რეგისტრაცია/OAuth, protected routes, workspace shell | fresh-user onboarding-ის სრული acceptance matrix, organization switcher, membership/invitation completion |
| Multi-tenancy | tenant-scoped data და encrypted vault contracts | ყველა repository/API/query-ის საბოლოო cross-tenant audit, indexes, pagination და authorization regression |
| Meta | OAuth/manual flow, Page selection, `/me` identity validation, App Secret Proof, webhook verification, encrypted token storage | external non-role OAuth, App Review/Live rollout, final request-contract retest, Verify Token rotation |
| Inbox | Page-aware conversation/thread, author labels, delivery states, handoff/pause UI | სრული persisted lifecycle, pagination, polling/realtime strategy, message send idempotency და durable worker integration |
| Products | catalog surface და prior upload/import foundation | საბოლოო CRUD/variants, multi-photo lifecycle, import preview/error report, archive/export acceptance |
| Knowledge/AI | knowledge/assistant surface და store-specific behavior | approval-first facts, evidence/citations, strict unknown fallback, AI quota/pause/handoff contract |
| Tickets/notifications | visible screens და persisted foundations | complete state transitions, owner/operator alerts, retry/error visibility, notification preferences |
| Billing/entitlements | plan/trial foundation is present in parts | provider-agnostic checkout adapter, server-side limits, usage ledger, upgrade/cancel receipts; no provider enabled without credentials |
| Worker/queue | durable job/idempotency contract and safe adapter foundations | production trigger/hosting, lease/retry/DLQ monitoring and truthful 10-second SLA gate |
| Analytics/alerts | meaningful persisted data surface | event definitions, rollups, filters, exports, alert thresholds and tenant-safe aggregation |
| Release/operations | checkpoints, builds, tests, docs | external test runbook, monitoring/runbooks, load benchmark, rollback and incident procedures |

## 2. არქიტექტურული პრინციპები

პროექტი გაგრძელდება არსებულ managed MySQL/TiDB data layer-ზე, მაგრამ database-specific დეტალები დარჩება repository/service layer-ში. UI ვერ გამოიძახებს SQL-ს, provider SDK-ს ან secret-bearing endpoint-ს პირდაპირ. tRPC იქნება ტიპიზებული application contract; Express routes დარჩება მხოლოდ Meta webhook/callback/scheduled boundary-ებისთვის.

ყველა business query მიიღებს explicit `organizationId`-ს server-side membership resolution-იდან. client-provided organization ID, Page ID ან user role არასოდეს იქნება authorization-ის წყარო. Repository მეთოდები და service ფუნქციები მოითხოვენ tenant context-ს და ყველა select/update/delete/insert query-ში გამოიყენებენ tenant predicate-ს. საჭირო ადგილას დაემატება compound unique/index: `(organizationId, externalId)`, `(organizationId, createdAt)`, `(organizationId, status)`, `(organizationId, conversationId, occurredAt)` და idempotency keys.

| ფენა | პასუხისმგებლობა | აკრძალული რამ |
|---|---|---|
| UI/page/component | Georgian-first presentation, form state, loading/error/empty states, accessible interaction | secret/API call, tenant decision, raw provider error, direct database access |
| tRPC/router | auth, input validation, entitlement check, service orchestration | duplicate business logic, unscoped query, raw token return |
| service/use-case | workflow state machine, transaction boundary, idempotency, policy | UI-specific strings, browser assumptions |
| repository | tenant-scoped persistence, indexes, pagination | accepting unverified tenant/user IDs |
| integration adapter | Meta/LLM/storage/payment provider contract | provider credential exposure, unbounded retry |
| worker/queue | lease, retry, dedupe, debounce, DLQ, metrics | in-memory-only job state, unbounded loop without hosting contract |

## 3. Design, voice და UX foundation

ვინარჩუნებთ NexaReply-ის მუქ იისფერ ვიზუალურ ენას, მაგრამ ყველა screen-ს ვამოწმებთ semantic token-ებზე. კომპონენტების token architecture იქნება `primitive → semantic → component`: ფერები, typography, spacing, radius, elevation, focus, success/warning/error/info და button states არ უნდა გაიფანტოს raw hex-ებად კომპონენტებში. Amadeo გამოიყენება მხოლოდ რეალურ pilot workspace-ის მონაცემად; generic workspace-ში sidebar/header იყენებს organization name-ს და არა `Amadeo`-ს.

Georgian-first copy იქნება პირველადი UI ენა: action labels, form errors, loading, empty, retry, permission explanation, Meta failure guidance, ticket/handoff text და notification titles. ინგლისური დარჩება მხოლოდ provider/API identifiers-ში ან საჭირო technical reference-ში. ყველა `coming soon` ან no-op კონტროლი ან სრულფასოვან action-ზე გადადის, ან მკაფიო, actionable feedback-ს აჩვენებს.

| UX gate | განხორციელების წესი |
|---|---|
| Accessibility | WCAG AA baseline; normal text contrast მინიმუმ 4.5:1; semantic HTML; visible focus; keyboard navigation; `aria-label`, `aria-expanded`, `aria-pressed`, `aria-describedby` საჭიროებისას |
| Touch და button | მინიმუმ 44×44px pointer/touch target, 8px spacing, `type="button"`/`submit` სწორი semantics, loading-ზე disabled + spinner/status |
| Forms | visible labels, inline validation, field-level error, submit success/error, retry, no placeholder-only labels |
| Responsive | mobile-first 375px, 768px tablet, 1024px desktop, 1440px large; no horizontal scroll; `min-h-dvh`; fixed bars არ ფარავს focus/content-ს |
| Motion | transform/opacity-only; shared motion tokens; interruptible transitions; `prefers-reduced-motion`; auto-rotating demo-ს pause/stop და focus-ზე შეჩერება |
| Data display | skeleton >1s wait-ისთვის, accessible empty/error states, pagination/virtualization 50+ ჩანაწერზე, status ტექსტით და არა მხოლოდ ფერით |
| Brand | consistent Lucide/SVG icon family, no emoji structural icons, no copied Alita branding/copy/data, clear NexaReply/Amadeo distinction |

გამოყენებული design/UX skills-ის შედეგი იქნება არა ახალი შემთხვევითი theme, არამედ არსებული dark/purple system-ის ტექნიკური გამაგრება: UI Designer-ის component specs, UX Architect-ის layout/contract boundaries, UI Styling-ის shadcn/Radix/Tailwind primitives, UI/UX Pro Max-ის accessibility/responsive checklist, Design System-ის three-layer tokens და Brand/Brand Guardian-ის voice/identity guardrails. UX Researcher-ის მიდგომით თითოეულ მნიშვნელოვან flow-ს ექნება task-based acceptance test: registration → workspace → Page connection → first product → first knowledge approval → inbound message → approved reply → ticket resolution.

## 4. სამუშაო ფაზები

### Phase 1 — Production baseline, readiness audit და self-service gating

**მიზანი:** შექმნას სანდო baseline, დაადასტუროს რა არის ნამდვილად მზად, აღმოაჩინოს ყველა gap და შემდეგი ფაზებისთვის უსაფრთხო contract-ები და truthful UI მდგომარეობა ჩამოაყალიბოს.

#### Phase 1A — read-only technical audit

1. წაიკითხება `todo.md`, Meta docs, current schema, `server/db.ts`, routers/services, Meta adapter, worker/job code, DashboardLayout, `AmadeoWorkspaceScreens.tsx`, current tests და build configuration. გაიმიჯნება უკვე შესრულებული, code-side დარჩენილი და owner-dependent item.
2. შეიქმნება endpoint/data-flow matrix: registration, organization resolution, Meta OAuth start/callback, Page picker, manual connect, webhook GET/POST, deauthorize/data deletion, send reply, AI draft, ticket/handoff, product import/export, knowledge approval, notifications, analytics, billing hooks და worker callbacks.
3. შესრულდება source-level interaction scan: every `<button>`, `type=submit`, icon control, dropdown, tab, pagination, row action, form submit, `onClick`, navigation link და modal control უნდა ჰქონდეს state change, navigation, mutation, download, copy feedback ან explicit actionable error.
4. შესრულდება secret-boundary scan: token names, raw provider payload, App Secret, Verify Token, ciphertext, authorization code, private IDs და customer PII არ უნდა გამოჩნდეს response, browser storage, rendered HTML, logs ან tests.
5. session config/connector state შემოწმდება მხოლოდ read-only რეჟიმში. Meta credential/connector ცვლილება Phase 1-ში აკრძალულია.

#### Phase 1B — truthful self-service connection UX

Front-end-ზე Meta integration screen-ს ექნება მკაფიო state machine: `not_configured → test_only → authorizing → selecting_page → validating → subscribing → connected → delivery_failed → reconnect_required`. Development-mode/role-only banner იქნება visible, მაგრამ მომხმარებელს არ აიძულებს token-ის ჩასმას, თუ OAuth გზა არსებობს. Manual path დარჩება owner-gated; ordinary members ვერ ნახავენ secret-bearing form-ს.

Back-end-ზე დადასტურდება და საჭიროების შემთხვევაში გამაგრდება: OAuth state nonce cookie, fixed in-app return path, callback URI character-for-character validation, Page candidate safe metadata, server-side code exchange, Page-token `/me?fields=id,name` self-identity, submitted Page ID strict match, App Secret Proof, form-encoded `subscribed_fields`, encrypted tenant vault, idempotent connection attempt და safe categorized errors. `META_LOGIN_CONFIG_ID` ცარიელი დარჩება, სანამ owner Meta Dashboard-ში production configuration-ს არ შექმნის და არ დაადასტურებს.

#### Phase 1C — Phase 1 deliverables და acceptance

| Acceptance | შემოწმება |
|---|---|
| New user ქმნის საკუთარ organization/workspace-ს | fresh account test; organization membership persisted; no other tenant visibility |
| OAuth status truthful-ია | role user-ს test state; non-role user-ს explicit approval/Live limitation; no false “public ready” claim |
| Page candidates უსაფრთხოა | მხოლოდ ID/name/status; Page token და App Secret არასდროს response-ში |
| Existing Khavsi არ იცვლება | no credential writes; no destructive Meta test; current connection smoke remains intact |
| ყველა connection action-ს შედეგი აქვს | loading, disabled, success, categorized error, retry/reconnect states |
| Regression | tenant isolation, OAuth nonce, Page mismatch, webhook encoding/proof, redaction, TypeScript, Vitest, build |

**Phase 1-ის დაწყების ზუსტი რიგი approval-ის შემდეგ:**

1. baseline source/schema/config audit;
2. open-item matrix-ის განახლება და risk register;
3. current connection/OAuth state machine-ის contract test-ები;
4. მხოლოდ დადასტურებული gap-ების minimal repair — არსებული Khavsi flow-ის გარეშე;
5. Georgian UI states და accessibility/responsive correction;
6. focused tests → TypeScript → full Vitest → build → responsive/browser smoke;
7. checkpoint და phase report.

### Phase 2 — Multi-tenant onboarding, membership და Meta self-service core

**Front-end:** two-step New Assistant wizard; organization name/slug; connected checklist; OAuth Page picker; one-page auto-connect; multiple-page selection; safe manual fallback; connection retry/disconnect/reconnect; test-mode copy; organization switcher; owner/member role visibility; invitation acceptance screens; loading/empty/error states.

**Back-end:** organization creation service; membership resolver; role matrix Owner/Operator/Viewer; invitation token hash + expiry + one-time redemption; Meta integration per organization; connection audit; deauthorization/data deletion; server-side entitlement check before connection; rate limiting on OAuth initiation, callback, manual connect and reconnect.

**Algorithms:**

- `resolveTenant(request)`: authenticate session → load active membership → derive organization ID server-side → verify role/entitlement → pass immutable `TenantContext` to service.
- `connectMetaPage`: create random attempt ID → validate OAuth state/nonce → exchange code server-side → list candidates → on selection verify Page identity/token usability → subscribe webhook → encrypt token → transactionally persist integration → emit audit event → return redacted status.
- `disconnect`: mark connection `disconnecting` → attempt provider unsubscribe with bounded retry → if provider fails keep vault and set `reconnect_required`/`unsubscribe_failed`; never silently delete useful credentials or other tenant data.

**Acceptance:** organization A cannot read, update, send with, or receive events for organization B; a Page can be connected only from authorized OAuth/manual proof; operator cannot access owner-only credentials or Meta setup; invitation cannot be replayed; each error is visible and recoverable.

### Phase 3 — Products/catalog completion

**Front-end:** product list with search/filter/pagination; create/edit drawer; brand, fragrance name, volume, price, availability, description, variants; multi-photo gallery; primary image; accessible alt text; archive/restore; CSV import wizard with preview, row errors, partial/atomic mode; CSV export; empty/loading/error states.

**Back-end:** product/variant/image repository methods; tenant composite indexes; price/availability validation; object-storage upload through `storagePut`; DB stores only storage key/url and metadata, never bytes; image MIME/size/count validation; import job or bounded request contract; export query with tenant filter; archive semantics preserving conversation evidence.

**Import algorithm:** parse UTF-8 CSV server-side → normalize headers and Georgian/English aliases → validate each row → resolve deterministic external row key → preview error list without writes → owner confirms → transaction/batched upsert → idempotency key prevents duplicate import → return created/updated/skipped/error summary. Images use unique tenant-scoped keys and are referenced by DB metadata.

**Acceptance:** 0-byte/oversized/unsupported files are rejected; failed row is explained; retry does not duplicate products; image bytes never enter DB; a product in organization A is invisible to B; export contains only current tenant records.

### Phase 4 — Approval-first Knowledge Base და AI Assistant

**Front-end:** knowledge capture form (“მიწოდება”, “გადახდა”, “მისამართი”, “ავთენტურობა”, “დაბრუნება”, “store policy”, FAQs); structured draft preview; evidence/source labels; edit/reject/approve; version history; active/inactive state; assistant persona/tone/answer length; AI pause; safe test conversation; unknown/handoff explanation.

**Back-end:** knowledge source/draft/fact/version tables or missing equivalents; approval workflow; AI settings per organization; retrieval service scoped to approved product/knowledge data; LLM adapter only server-side; model catalog lookup/config rather than stale hardcoded assumptions; structured JSON response schema; usage/quota accounting; ticket creation for unknown.

**Grounded answer algorithm:**

1. Load latest inbound message and bounded conversation context under tenant scope.
2. If AI paused, automation disabled, outside entitlement/quota, or human takeover active, create no AI send job.
3. Retrieve only active approved facts, current products, availability, price and relevant policy records for the same organization.
4. Build a prompt that explicitly forbids invented availability, price, delivery promises, policy or customer data; include source IDs/evidence text.
5. Call server-side `invokeLLM`; validate strict structured output: `answer`, `confidence`, `usedEvidence[]`, `unknown`, `handoffReason`, `safetyFlags`.
6. Programmatically reject malformed/unsupported claims; if evidence is insufficient, return safe Georgian fallback and create an idempotent handoff ticket.
7. Persist AI draft and evidence, never auto-send unless organization plan and automation setting permit it; operator approval remains visible.
8. Use idempotency key `(organizationId, conversationId, inboundMessageId, assistantVersion)` to prevent duplicate drafts/tickets.

**Acceptance:** no approved knowledge means no confident fabricated answer; price/stock comes only from current tenant catalog; unknown question creates one ticket; AI pause stops new automation while preserving history; operator takeover cancels/prefixes pending AI sends; AI key/model never reaches browser; quota failure is explicit.

### Phase 5 — Durable Inbox automation, worker და 10-second SLA gate

**Front-end:** three-column responsive Inbox where possible; conversation list/thread/customer context; server pagination; live/refresh state; AI draft + evidence; operator approval; human takeover; AI pause/resume; send composer; attachment policy; message author labels (customer, NexaReply AI draft, operator, system); delivery status (draft, pending, processing, sent, failed, retrying); queue status (pending, processing, failed, retrying, dead-letter); ticket/handoff; visible retry and recovery controls.

**Back-end:** message/conversation repositories; Meta send adapter; webhook event persistence; queue/job repository; idempotency record; lease/retry/DLQ; conversation debounce record; org rate limit; worker health endpoint/status; operational metrics; audit event.

**Webhook algorithm:**

1. GET verification compares managed Verify Token and returns challenge only on exact match.
2. POST reads raw request body; computes HMAC-SHA256 with Meta App Secret; compares with `X-Hub-Signature-256` using constant-time comparison; rejects missing/invalid signatures.
3. Parse provider event after signature validation; derive Page ID; resolve organization by Page integration server-side.
4. Insert `externalEventId` with unique `(pageId, externalEventId)`/provider event key; duplicate returns 2xx without second business action.
5. Persist inbound message before queueing; enqueue AI/automation job with organization, conversation, message and idempotency references; never put token in job payload.
6. Return quickly; worker handles downstream work.

**Job algorithm:**

- Job row contains `organizationId`, `type`, `dedupeKey`, `availableAt`, `attempts`, `leaseOwner`, `leaseExpiresAt`, `lastErrorCategory`, `deadLetteredAt`, timestamps and bounded payload reference.
- Claim uses atomic conditional update: eligible pending/retry job + expired/no lease → processing + lease expiry; worker ownership is checked on completion.
- Success marks completed; transient Meta/LLM/storage failures schedule exponential backoff with jitter and bounded attempts; policy/validation failures go directly to failed/DLQ.
- Lease expiry makes abandoned processing jobs reclaimable; no worker trusts in-memory state as truth.
- Per-organization concurrency/rate limit prevents one tenant from starving others.
- Send idempotency key `(organizationId, pageId, conversationId, clientMessageId)` prevents duplicate outbound replies; provider message ID is persisted when returned.

**Debounce algorithm:** inbound events for the same organization/conversation are grouped by a durable `debounceUntil = lastInboundAt + 10 seconds`. Worker claims only after the due time, re-reads conversation state, collapses pending inbound messages into one AI context, and atomically marks the batch consumed. A production 10-second guarantee is **not claimed** until a durable trigger/hosting configuration capable of waking the worker within the required budget is selected, deployed and measured. The current WebDev scheduled-work constraints and existing deferred dispatch contract remain explicit risks.

**Hosting decision gate:**

1. DB queue/lease/idempotency contract can be implemented and tested now.
2. A 60-second-or-slower heartbeat is not a 10-second SLA; it may be used only as best-effort fallback with honest UI copy.
3. Before production SLA claim, evaluate WebDev Reserved Hosting or a user-approved external durable queue/worker. Reserved Hosting is a managed persistent 1 vCPU/512 MB option; full-utilization compute ceiling is approximately $37.50/month before the included $10 monthly usage credit, plus metered egress/volume. It must be approved before enabling.
4. No `setInterval`/`node-cron` in the stateless app. Use a durable external trigger/worker contract and health/lease telemetry.

**Acceptance:** repeated webhook is processed once; retry/lease/DLQ is visible; tenant isolation is enforced in worker; failed send appears as failed/retrying with recovery; worker health is monitorable; 10-second badge appears only after measured production trigger validation.

### Phase 6 — Tickets, owner/operator notifications და handoff

**Front-end:** ticket queue with status, priority, reason, linked conversation, assignee, SLA/age, filter/search, assignment, resolve/reopen, internal note, customer-safe reply path; notification center with unread/read, source, severity, retry and preference controls.

**Back-end:** ticket state machine `open → assigned → in_progress → waiting_customer → resolved → reopened`; transition authorization; event audit; deduped notification records; owner-only operational notification through `notifyOwner` for critical integration/worker failures; app-specific end-user notifications remain in the app; optional Telegram/email stays disabled unless separately configured.

**Algorithm:** handoff creation uses deterministic key `(organizationId, conversationId, reason, sourceMessageId)`; if ticket exists, append evidence rather than duplicate. Notification delivery stores status and attempts; upstream false/temporary failure produces a visible retryable state, not silent loss.

### Phase 7 — Analytics, alerts და exports

**Front-end:** tenant-scoped dashboard cards/charts for response rate, AI vs human, tickets, leads/orders if persisted, delivery failures, queue health, channel use and time windows; accessible legends/tooltips; export action with progress/result/error; alerts center.

**Back-end:** canonical event taxonomy (`message_received`, `draft_created`, `reply_sent`, `reply_failed`, `handoff_created`, `ticket_resolved`, `lead_created`, `product_imported`, `connection_changed`); tenant-safe aggregation queries; UTC persistence and local display; optional rollup tables for scale; alert threshold service.

**Algorithm:** write immutable audit/event record at business transition; aggregate by organization and UTC window; exclude secrets and raw message content from analytics unless explicitly needed; query bounded date ranges with pagination; export streams only authorized tenant rows. Alerts use dedupe window and severity to avoid notification storms.

### Phase 8 — Plans, trial, quota და billing adapter

**Front-end:** plan/trial status, entitlement matrix, usage meters, quota warnings, channel/member/AI limits, upgrade CTA, checkout pending/success/failure/cancel state, receipts/history, cancel/renew state; no hidden price or fake payment success. If provider is not configured, use explicit “billing setup required” state.

**Back-end:** plan catalog, organization entitlement snapshot, usage ledger, member/channel limits, trial timestamps, checkout provider interface, webhook signature/idempotency, invoice/receipt records, cancellation state. All permission/quota decisions are server-side and repeated in every mutation/worker path.

**Algorithm:** `checkEntitlement(organizationId, capability, quantity)` loads current plan/trial and usage atomically; mutation reserves or consumes usage under transaction; duplicate provider webhook uses event idempotency; downgrade never deletes data automatically; over-limit UI is advisory but server rejects the operation with a categorized error. No production payment provider will be enabled without chosen credentials and owner confirmation.

### Phase 9 — Roles, invitations და organization switcher completion

**Front-end:** owner-only Members page; invite form; pending/expired/accepted states; role selection; revoke/resend; organization switcher; current workspace context in header; no access to another tenant until membership is verified.

**Back-end:** invitation token is random, stored hashed, expires, one-time; email address normalized; accepting user must be authenticated and invitation target checked; owner-only mutation; operator cannot promote itself or change owner; organization deletion/export requires explicit confirmation and policy.

### Phase 10 — Meta Business Verification, App Review და public Live rollout

ეს ფაზა ნაწილობრივ კოდისგან დამოუკიდებელია და owner action gate-ებზეა დამოკიდებული. Code side-ში მზადდება reviewer-friendly test account/Page guidance, permission-by-permission description, exact URLs, safe screencast script, redaction checklist, failure recovery and post-Live validation matrix.

**Owner sequence:**

1. Existing NexaReply Meta App და Business Portfolio; არ შეიქმნას replacement App.
2. Business Portfolio Full control, legal business details, official evidence და public HTTPS site.
3. Security Center → Business Verification; rejection/pending handling ოფიციალური დოკუმენტების მიხედვით.
4. Access Verification/Advanced Access მოთხოვნები; request only permissions demonstrated by code.
5. Preserve current strategy until validated: core `pages_show_list`, `pages_manage_metadata`, `pages_messaging`; retain `business_management`/`pages_read_engagement` only with narrow, documented fallback evidence if still required.
6. Verify Facebook Login for Business production configuration and only then set `META_LOGIN_CONFIG_ID` via managed configuration.
7. App Review screencast: OAuth → Page picker → webhook status → inbound test → AI draft/evidence → operator approval → outbound delivery → handoff; no secrets/raw payload/PII.
8. After approval, switch App to Live/Public; immediately run fresh non-role account tests.
9. Verify Token rotation is separate: prepare new value, update managed secret and Meta webhook setting in one coordinated window, then verify GET webhook and preserve rollback instructions. Do not paste replacement token into Chat.

**External acceptance matrix:** fresh registration, isolated workspace, external OAuth, one Page auto-connect, multiple Page picker, browser secret scan, inbound dedupe, outbound delivery, delivery failure, disconnect/reconnect, deauthorize/data deletion. Run against at least two distinct fresh accounts/Page contexts if available. Until all pass, UI states public self-service as pending approval, not ready.

### Phase 11 — Security, scale, monitoring და runbooks

Security work includes secret-boundary tests, constant-time signature validation, CSRF/state validation, rate limits, input size/MIME checks, PII minimization, audit logging, encrypted vault key rotation procedure, data retention/deletion, failed login/OAuth throttling and provider-error redaction. No diagnostic endpoint may return raw Graph/LLM/provider payload.

Scale work includes cursor pagination, compound indexes, bounded query sizes, queue fairness, per-tenant concurrency, connection pooling review, 100-organization benchmark as an automatic load-test target rather than a platform ceiling, and a synthetic test tenant that is never the real Amadeo/Khavsi tenant.

Monitoring includes webhook acceptance/failure, queue lag, oldest job age, lease expiry, retry rate, DLQ count, Meta delivery failures, LLM latency/error/quota, storage failures, notification failures, auth/OAuth conversion and tenant isolation alerts. Runbooks cover Meta outage, invalid signature, token expiry, provider rate limit, worker crash, database degradation, DLQ replay, accidental disconnect, data deletion and rollback.

### Phase 12 — Release, deployment და final QA

Every implementation slice follows the existing WebDev loop: schema change → migration generation → inspect generated SQL → apply managed DB migration → repository helper → tRPC/router contract → UI hook → tests → TypeScript → production build → deployed smoke. No secrets in `.env` committed or in generated artifacts.

| QA layer | Required coverage |
|---|---|
| Unit | parsers, validators, state transitions, entitlement math, HMAC, OAuth state, token redaction, debounce calculation |
| Integration | tRPC authorization, repository tenant predicates, Meta adapter contract, webhook persistence/dedupe, queue lease/retry/DLQ, LLM structured output, storage metadata |
| Security | cross-tenant read/write/send, operator vs owner, replayed invitation, replayed webhook, invalid signature, Page mismatch, secret response/browser scan, rate limit |
| UI | every button outcome, loading/disabled/success/error, keyboard, focus, screen reader labels, modal escape, pagination, form errors, mobile layout |
| Visual | 375px, 768px, 1024px, 1440px; dark mode; responsive no-overflow; reduced motion; long Georgian labels; dense Inbox/table states |
| Build | `pnpm exec tsc --noEmit && pnpm test && pnpm build` after each vertical slice |
| Live smoke | safe current Khavsi inbound/outbound checks only when needed; never use destructive disconnect/credential rotation in automated tests |

Final release gate requires: no unchecked silent action; no unauthorized tenant path; no secret exposure; no false public-readiness claim; current Khavsi connection intact; all mandatory tests/build pass; production deployment/rollback evidence saved; owner-dependent Meta blockers documented.

## 5. სამუშაოს მართვის წესები და checkpoint policy

ყოველი phase დაიხურება მხოლოდ მაშინ, როცა `todo.md`-ში შესაბამისი item-ები `[x]`-ადაა მონიშნული, findings/report ფაილში წერია რა შეიცვალა და რა არ შეიცვალა, targeted/full QA შედეგები შენახულია, responsive screenshot smoke დასრულებულია და checkpoint შეიქმნა. Failed test არ მოინიშნება წარმატებულად; managed-secret tests განზრახ skipped თუ დარჩება, report-ში მიზეზი და owner action უნდა ეწეროს.

Phase-ებს შორის არ უნდა მოხდეს ფართო rewrite. თითოეული slice უნდა იყოს პატარა, reversible და checkpointable. Schema changes ყოველთვის უნდა იყოს migration-ით; test data უნდა იყოს synthetic; real Khavsi/Amadeo records არ უნდა იქნას გამოყენებული destructive fixtures-ად. Browser-side copy უნდა იყოს Georgian-first, მაგრამ Meta reviewer documentation შეიძლება იყოს ინგლისურადაც, რათა endpoint/permission semantics არ დამახინჯდეს.

## 6. გამოყენებული skills და მათი როლი

| Skill | გამოყენება ამ plan-ში |
|---|---|
| `webdev-readme-fullstack` | React/tRPC/Drizzle/WebDev build loop, file boundaries, migrations, storage and auth conventions |
| `frontend-developer` | React 19 component boundaries, hooks, typed mutations, loading/empty/error states |
| `senior-developer` | production craftsmanship, performance, interaction QA; Laravel-specific ნაწილი არ გადმოგვაქვს React stack-ში |
| `ui-ux-pro-max` | accessibility, responsive, interaction, animation, charts, button and visual QA checklist |
| `ui-designer` | design-system-first, component states, WCAG AA, handoff and responsive framework |
| `ui-styling` | shadcn/Radix/Tailwind composable controls, forms, dialogs, tables, theme tokens |
| `ux-architect` | information architecture, service boundaries, layout and contract foundations |
| `ux-researcher` | task-based validation, consent/privacy, usability metrics and Georgian user journeys |
| `design-system` | primitive→semantic→component tokens and state/variant contracts |
| `brand` + `brand-guardian` | NexaReply voice, Amadeo pilot separation, no copied Alita brand/copy, truthful claims |
| `automation-and-scheduling` | durable job lifecycle, event-triggered integration, retry/idempotency and safe scheduler choice |
| `webdev-periodic-updates` | no unsafe in-process cron/timer, `/api/scheduled/*` constraints, idempotent handler rules |
| `persistent-computing` | Reserved Hosting versus autoscale decision, 10-second SLA cost/risk gate |
| `builtin-llm-models` + `webdev-llm-integration` | server-only LLM calls, runtime model catalog, structured JSON, quota and grounding |
| `webdev-file-storage` | S3/object storage references, upload validation and no DB blobs |
| `webdev-owner-notifications` | owner operational alerts separated from end-user messaging |
| `webdev-manus-oauth` | origin-safe redirect, nonce/state, cookie/session security and no hand-rolled callback |
| `manus-config` | read-only connector/config inspection and load→edit→save discipline for any future approved change |

Image-generation, banner, slides, mobile, game, app-store and finance-modeling skills are **not forced into this implementation** because the remaining work is a web SaaS product, backend/Meta integration and operational readiness. They should be activated only if a separate visual asset, presentation, mobile client, game, ASO or financial-model request is made.

## 7. Assumptions, risks და open decisions

1. **Meta approval is external.** Business Verification/App Review/Live mode cannot be completed by code alone. The application remains truthful and role-user-testable until owner completes the Meta steps.
2. **No replacement App.** The current NexaReply Meta App and active Khavsi connection are the protected production baseline.
3. **Billing provider is not selected.** The plan includes an adapter and server-side entitlement model, not a fake checkout or unapproved provider activation.
4. **10-second debounce is a release gate, not a current claim.** DB durability, lease and dedupe may be implemented before the production trigger; UI must show the honest state.
5. **Managed secret rotation requires explicit owner confirmation.** Verify Token rotation is coordinated and never performed silently.
6. **LLM catalog can change.** Model IDs, pricing and capabilities are discovered from the live catalog at implementation time; no stale model assumption is treated as contract.
7. **External-account testing needs a fresh non-role Facebook account and a dedicated test Page.** Real customer conversations and production credentials are excluded.
8. **Potential large bundle warning remains a performance item.** Route/feature splitting and list virtualization are planned if measured bundle or list size warrants them.

## 8. Phase 1 success definition

Phase 1 is complete when NexaReply has a written, source-grounded gap matrix; all current Meta/OAuth/tenant/worker contracts are regression-tested; the self-service UI tells the truth about role-only versus public approval; every connection control has explicit feedback; no secret or active Khavsi credential changes occurred; fresh-user organization isolation passes; targeted and full QA pass; and a checkpoint/report records the exact next phase.

**Next phase after Phase 1:** implement only the confirmed gaps from Phase 2 — multi-tenant onboarding and Meta self-service core — then proceed vertically through Catalog, Knowledge/AI, Inbox/Worker, Tickets/Notifications, Analytics, Billing, Roles, Meta Live rollout and scale/release gates.

## References

- [NexaReply Meta Live/App Review plan](./meta_live_app_review_plan_2026-08-16.md)
- [NexaReply Alita parity delivery plan](./alita_parity_delivery_plan.md)
- [META_SETUP.md](../META_SETUP.md)
- [META_APP_REVIEW.md](../META_APP_REVIEW.md)
- [Meta App Review submission guide](https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review/submission-guide)
- [Meta Graph API access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/)
- [Meta Business Verification Help](https://www.facebook.com/business/help/2058515294227817)
- [Meta rejected verification Help](https://www.facebook.com/business/help/2342133782492969)
