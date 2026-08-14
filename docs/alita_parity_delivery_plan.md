# NexaReply — self-service SaaS delivery plan

## Product goal

NexaReply must let every merchant create an account, open an isolated workspace, activate a plan or trial, connect **their own** Meta Page, add product/knowledge data, and operate Messenger automation without an administrator touching that merchant's credentials. The existing Amadeo workspace remains a real pilot workspace, not a global default.

## Design direction

- Georgian-first, responsive desktop and mobile interface.
- Preserve NexaReply's polished dark/purple identity; borrow only interaction patterns from the supplied Alita references.
- Use concise card layouts, a 2-step connection wizard, clear success/error states, one primary action per screen, keyboard focus states, and reduced-motion-safe transitions.
- Never copy Alita branding, source code, text, pricing, or user data.

## Delivery phases

### Phase A — self-service onboarding (current implementation focus)

1. Replace pilot-only Meta connection UI with a two-step **New assistant** wizard.
2. Give the owner two explicit connection paths:
   - **Connect with Facebook**: OAuth → returned Page list → choose a Page → server-side webhook subscription → encrypted tenant vault.
   - **Manual connection**: Page ID + Page access token → server-side verification/subscription → encrypted tenant vault.
3. Store each Page token encrypted per organization. Tokens, application secrets, and webhook verification values must never be returned to the browser or logs.
4. Make workspace branding generic. The sidebar and headers must use the selected organization name rather than `Amadeo`.
5. Show a safe connected Page confirmation card and a next-step checklist.

### Phase B — core Alita parity

1. Inbox: searchable conversations, AI draft/evidence panel, typing/debounce state, human takeover, manual reply, delivery state, and ticket handoff.
2. Catalog: product and variant CRUD, CSV/XLSX import/export, stock and price state, multi-image gallery, primary image, accessible alt text, and archive workflow.
3. Knowledge: plain-language input → approval-first structured AI draft → edit/reject/approve facts; policies, delivery, payment, locations, FAQs.
4. Assistant: persona, tone, answer length, unknown-question fallback, automation pause, and safe testing mode.
5. Notifications: owner/operator alerts in-app plus optional Telegram/email delivery.

### Phase C — commercial and operational readiness

1. Billing screen with trial countdown, plan limits, usage meter, checkout/upgrade/cancel receipts, and no hidden price assumptions.
2. Durable queue worker trigger with scheduling, leases, retry policy, idempotency, tenant rate limits, health status, and a 10-second debounce SLA only after hosting is configured.
3. Owner analytics for response rate, AI vs human, tickets, leads, orders, channel use, and exports.
4. Self-service roles/invitations and organization switcher.

### Phase D — channels and scale

1. Instagram Direct and Telegram as separate, entitlement-gated integrations.
2. Load tests for 100+ organizations; tenant authorization and secret-boundary tests remain mandatory.
3. Monitoring, audit events, support tools, retention policy, and documented incident/recovery runbooks.

## Acceptance criteria for Meta connection

- A signed-in workspace owner can connect only Pages they have authorized or manually provide a valid Page token for.
- OAuth page candidates show only Page ID/name; access tokens never leave the server.
- A manual token is used once for validation and then encrypted before persistence; it is never sent back in a tRPC response.
- Connecting a Page for organization A cannot overwrite, view, send with, or receive events for organization B.
- Current Amadeo credentials/connections are not modified by UI work or tests.
- A connected Page receives `messages`, `message_deliveries`, `message_echoes`, and `messaging_postbacks` subscriptions.

## Explicit non-goals for this slice

- No production billing provider is enabled without the chosen merchant/account credentials.
- No promise of a durable 10-second worker is made until a scheduler/worker host is configured.
- No Meta App Review is bypassed; Development mode remains restricted to authorized App-role accounts.
