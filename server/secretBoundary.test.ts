import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

describe("secret boundary", () => {
  it("does not place provider secret identifiers in client-side sources", () => {
    const clientRoot = join(process.cwd(), "client", "src");
    const publicShell = readFileSync(join(clientRoot, "pages", "DemoWorkspace.tsx"), "utf8");
    const protectedShell = readFileSync(join(clientRoot, "pages", "AuthenticatedWorkspace.tsx"), "utf8");
    const exposed = `${publicShell}\n${protectedShell}`;
    expect(exposed).not.toMatch(/OPENAI_API_KEY|META_APP_SECRET|TELEGRAM_BOT_TOKEN|DATABASE_URL/);
  });

  it("keeps integration state outside public Demo procedure responses", async () => {
    const ctx = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const caller = appRouter.createCaller(ctx);
    const bootstrap = await caller.nexareply.demo.bootstrap();
    const publicSurface = await Promise.all([
      caller.nexareply.demo.data.overview(),
      caller.nexareply.demo.data.products.list(),
      caller.nexareply.demo.data.knowledge.list(),
      caller.nexareply.demo.data.conversations.list(),
      caller.nexareply.demo.data.leads.list(),
      caller.nexareply.demo.data.leads.draftOrders(),
      caller.nexareply.demo.data.notifications.list(),
      caller.nexareply.demo.data.analytics(),
      caller.nexareply.demo.imports.exportCsv({ kind: "leads" }),
      caller.nexareply.demo.imports.exportCsv({ kind: "orders" }),
    ]);
    expect(JSON.stringify([bootstrap, publicSurface])).not.toMatch(/integrationSettings|clientSecret|encryptedConfig|accessToken|apiKey|secret/i);
    expect("owner" in caller.nexareply.demo).toBe(false);
  });
});
