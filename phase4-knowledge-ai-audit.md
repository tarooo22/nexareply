# NexaReply — Phase 4 Knowledge and AI Audit

**Audit date:** 2026-08-24  
**Scope:** Approval-first knowledge, grounded AI drafts, handoff and server-only LLM boundaries.

## Verified foundations

| Control | Verified behavior |
|---|---|
| Approval-first extraction | The LLM extraction service uses a strict JSON schema, persists original merchant text plus pending drafts, and does not create active knowledge facts itself. |
| Owner approval | Only owner-scoped draft procedures can edit, approve or reject pending drafts; approved drafts become tenant-scoped active knowledge facts. |
| Grounding | The active draft generator uses only same-tenant catalog rows or active same-tenant knowledge facts. |
| Unknown question | The neutral Georgian holding reply, idempotent ticket, idempotent notification and `needs_human` AI pause are created when no supported evidence exists. |
| Human control | Takeover pauses AI; the draft generator returns a blocked result when takeover or a non-active AI state is present. |
| Secrets | LLM calls and model catalog lookup are server-only; browser DTOs do not carry provider credentials. |

## Confirmed Phase 4 gap

The durable draft/worker path does not currently call the existing server-side `requireEntitlement(scope, "ai_automation")` gate before creating an automated AI draft. The entitlement helper already correctly blocks inactive plans and disabled AI automation, so the safe repair is to enforce it only in the non-demo worker-generated automation path; inbound message persistence must remain available even when automation is unavailable.

## Implemented repair and validation

The durable worker now passes an explicit `automated: true` flag to the draft generator. For a non-demo workspace, the generator checks the existing server-side `ai_automation` entitlement before drafting; a blocked plan produces a safe blocked outcome that completes the job without sending or drafting a customer reply. Manual operator-initiated draft review and inbound event persistence remain unchanged. The worker contract test now asserts the explicit flag. TypeScript, the full Vitest suite, and the production build pass after this repair.
