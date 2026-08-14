# NexaReply

NexaReply is a Georgian-first Messenger sales workspace. It combines a public marketing site, an unauthenticated sanitized TechZone Demo Mode, and a first-party email/password-protected organization workspace foundation.

## Current architecture

The application uses React, Express, tRPC, Drizzle, and MySQL/TiDB. Users register and sign in with a NexaReply email/password account; password material is salted and scrypt-hashed server-side, and an httpOnly signed session cookie carries only a numeric user identifier. Manus OAuth is not used for product authentication. Business data access is contained in `server/nexareplyRepository.ts`; UI components call typed tRPC procedures and never construct SQL or access secrets.

| Route | Purpose | Access |
|---|---|---|
| `/` | Georgian public marketing site | Public |
| `/demo` | Sanitized TechZone Demo with persistent demo data | Public, limited to the demo organization |
| `/auth` | NexaReply registration and login | Public |
| `/app` | Password-session-protected workspace bootstrap and organization membership | Authenticated users only |

## Persistent capabilities

The managed database stores organizations, memberships, plans and usage, products and variants, knowledge facts, conversations and messages, tickets, leads, draft orders, in-app notifications, audit events, and background-job records. The initial TechZone Demo seed is idempotent.

The Demo Mode operates against persisted catalog, knowledge, inbox, lead, notification, analytics, and draft-order data. CSV/XLSX catalog uploads pass server-side validation before valid rows are stored. Lead and draft-order CSV exports are generated from persisted organization-scoped data.

## Local commands

```bash
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm exec tsx scripts/seed-techzone.mts
```

Use `pnpm drizzle-kit generate` to create a migration after changing `drizzle/schema.ts`; review the generated SQL before applying it through the managed database workflow.

## Security and tenancy

Authenticated workspace procedures resolve the user membership server-side. Registration assigns an opaque local identity, stores only a salted password hash, and does not expose password hashes or internal identity values through tRPC. Existing legacy identity rows are retained but cannot be silently claimed by a newly registered email. Owner-only actions include integration state access, organization membership listing and role changes, and catalog import commits. Operators are rejected by the server before those procedures read or modify protected data.

Public Demo Mode does not accept an arbitrary organization identifier: it resolves only to the sanitized TechZone demo organization. Secrets remain server-side and must be supplied through managed configuration rather than committed environment files.

## Durable worker boundary

`background_jobs` persists conversation processing intent and idempotency keys. The current autoscaling request runtime does **not** provide a continuously running worker, so a saved ten-second debounce timestamp is not a production execution guarantee. Before enabling real Meta webhooks or customer automation, deploy and validate a durable scheduler/worker hosting configuration, then configure Meta signature verification and outbound notification delivery through managed secrets.
