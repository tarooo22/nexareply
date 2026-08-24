# NexaReply — Phase 3 Catalog Audit

**Audit date:** 2026-08-24  
**Scope:** Tenant-scoped product records, image assets, CSV/XLSX import/export and catalog UX. Meta connections and managed secrets are out of scope.

## Verified foundations

| Area | Current safe behavior |
|---|---|
| Product isolation | Product, variant and asset records are organization-scoped; server procedures resolve tenant membership before reads or mutations. |
| Assets | Images are validated server-side for base64, MIME, dimensions, pixel count and 5 MB limit; image bytes go to organization-scoped object storage, while the database stores metadata/reference only. |
| Gallery | A product has a six-image limit, primary-image selection, alt text, ordering and soft archive behavior. |
| Export | Product exports read only the caller's tenant scope. |
| Import preview | CSV/XLSX rows are parsed and validated before an owner chooses to commit. |

## Confirmed gaps

| Priority | Gap | Repair decision |
|---|---|---|
| High | Commit creates a second import record instead of consuming the preview record; retrying a committed file can generate duplicate-SKU errors rather than a deterministic result. | Reuse the preview import ID, make completed previews idempotently return their stored outcome, and perform tenant-scoped SKU create-or-update behavior. |
| Medium | The protected update procedure exists but catalog UI exposes only create/archive. | Add an owner edit entry point with mutation feedback in this phase if it can reuse the existing safe patch contract. |
| Medium | Catalog list is unbounded and lacks cursor pagination. | Keep as a separate incremental scale repair after import idempotency and edit workflow; do not claim Phase 3 scale acceptance until it is completed. |
| Medium | Import/export and asset regression coverage is narrow beyond parsing/basic MIME validation. | Add direct service tests for preview reuse, repeated commit, tenant-scoped update and stable result summary. |

## Implemented in the current Phase 3 slice

The import commit path now receives and consumes the preview record ID. A completed preview returns its stored summary without any product mutation; an unfinished preview resolves an existing product by the same tenant-scoped SKU and updates it instead of attempting a duplicate insert. New SKU rows are created normally. Regression tests cover completed-preview replay and same-SKU update behavior; TypeScript and focused import/asset tests pass.

The owner-facing product edit control and cursor pagination remain open items for the next Phase 3 increment. They are not claimed complete by the import-idempotency repair.
