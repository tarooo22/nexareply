# NexaReply — Shared Vendor Chunking Audit

**Audit date:** 2026-08-24

## Current state

The Vite build has route and workspace component lazy boundaries but no `rollupOptions.output.manualChunks` configuration. The primary bundle remains 728.2 kB before gzip and triggers a chunk-size advisory.

## Safe candidate boundaries

| Chunk | Dependencies | Reason |
|---|---|---|
| `react-vendor` | `react`, `react-dom`, `scheduler` | Stable framework runtime shared across all routes. |
| `ui-vendor` | `@radix-ui/*`, shadcn utilities | Shared interaction primitives used across public and workspace views. |
| `query-vendor` | `@tanstack/*` | Shared tRPC/query cache runtime. |
| `icon-vendor` | `lucide-react` | Icon code is shared but non-critical to data/auth behavior. |

## Guardrails

The strategy will not split application source modules, tRPC procedures, Meta adapters, secrets, authentication or database code. Route-level dynamic imports remain unchanged. The result must be checked with a production build and public/protected route smoke tests before checkpointing.

## Implementation result

The first build showed that a dedicated React boundary pulled an oversized transitive vendor chunk, so it was removed rather than published. The final strategy groups only shared UI primitives, query runtime and icons. The resulting initial application chunk is **488.7 kB before gzip**, down from **728.2 kB**, and the production build no longer emits a large-chunk advisory. Application, Meta, auth and tenant source modules remain outside `manualChunks`.
