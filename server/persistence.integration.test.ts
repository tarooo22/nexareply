import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { and, eq, sql } from "drizzle-orm";
import { backgroundJobs, conversations, notifications, organizationMemberships, tickets } from "../drizzle/schema";
import { getDb } from "./db";
import { nexareplyRepository } from "./nexareplyRepository";
import { appRouter } from "./routers";

function publicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function nonMemberContext(): TrpcContext {
  return { user: { id: 9_999_999, openId: "non-member", email: "none@example.com", name: "Non member", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("persistent multi-tenant foundation", () => {
  it("reads the seeded public Demo catalog and DB-derived analytics through tRPC", async () => {
    const caller = appRouter.createCaller(publicContext());
    const products = await caller.nexareply.demo.data.products.list();
    const analytics = await caller.nexareply.demo.data.analytics();
    expect(products.length).toBeGreaterThan(0);
    expect(analytics.conversationCount).toBeGreaterThan(0);
    expect(analytics.dailyVolume.length).toBeGreaterThan(0);
  });

  it("denies a user without a membership for the seeded demo organization", async () => {
    const demoScope = await nexareplyRepository.getPublicDemoScope();
    await expect(nexareplyRepository.getWorkspaceScope(9_999_999, demoScope.organizationId)).resolves.toBeNull();
    const protectedCaller = appRouter.createCaller(nonMemberContext());
    await expect(protectedCaller.nexareply.workspace.products.list({ organizationId: demoScope.organizationId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents a real member of another organization from accessing the demo organization", async () => {
    const db = await getDb();
    if (!db) throw new Error("Managed database is unavailable for integration verification.");
    const demoScope = await nexareplyRepository.getPublicDemoScope();
    const membership = (await db.select().from(organizationMemberships).where(sql`${organizationMemberships.organizationId} <> ${demoScope.organizationId}`).limit(1))[0];
    expect(membership).toBeTruthy();
    if (!membership) return;
    expect(await nexareplyRepository.getWorkspaceScope(membership.userId, demoScope.organizationId)).toBeNull();
    const context = { user: { id: membership.userId, openId: "tenant-a-member", email: "tenant-a@example.com", name: "Tenant A", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const protectedCaller = appRouter.createCaller(context);
    await expect(protectedCaller.nexareply.workspace.leads.list({ organizationId: demoScope.organizationId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const demoLead = (await appRouter.createCaller(publicContext()).nexareply.demo.data.leads.list())[0];
    expect(demoLead).toBeTruthy();
    if (!demoLead) return;
    await expect(protectedCaller.nexareply.workspace.leads.updateStage({ organizationId: demoScope.organizationId, leadId: demoLead.id, stage: "qualified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exports persisted lead and draft-order rows as CSV", async () => {
    const caller = appRouter.createCaller(publicContext());
    const leadsCsv = await caller.nexareply.demo.imports.exportCsv({ kind: "leads" });
    const ordersCsv = await caller.nexareply.demo.imports.exportCsv({ kind: "orders" });
    expect(leadsCsv).toContain('"სახელი","ტელეფონი","წყარო"');
    expect(leadsCsv.split("\n").length).toBeGreaterThan(1);
    expect(ordersCsv).toContain('"კლიენტი","სტატუსი"');
    expect(ordersCsv.split("\n").length).toBeGreaterThan(1);
  });

  it("deduplicates repeated ticket, notification, and pending job records and cleans up verification rows", async () => {
    const db = await getDb();
    if (!db) throw new Error("Managed database is unavailable for integration verification.");
    const scope = await nexareplyRepository.getPublicDemoScope();
    const conversation = (await nexareplyRepository.listConversations(scope))[0];
    if (!conversation) throw new Error("Seeded conversation is unavailable.");
    const key = `integration-dedupe-${Date.now()}`;
    const before = await nexareplyRepository.getConversation(scope, conversation.id);
    try {
      const ticketA = await nexareplyRepository.createTicketOnce(scope, conversation.id, "integration_test", "normal", key);
      const ticketB = await nexareplyRepository.createTicketOnce(scope, conversation.id, "integration_test", "normal", key);
      const notificationA = await nexareplyRepository.createNotificationOnce(scope, { type: "needs_human", title: "integration test", body: "integration test", relatedConversationId: conversation.id, dedupeKey: key });
      const notificationB = await nexareplyRepository.createNotificationOnce(scope, { type: "needs_human", title: "integration test", body: "integration test", relatedConversationId: conversation.id, dedupeKey: key });
      const jobA = await nexareplyRepository.scheduleConversationProcessing(scope, conversation.id, key, new Date(Date.now() + 30_000));
      const jobB = await nexareplyRepository.scheduleConversationProcessing(scope, conversation.id, `${key}-latest`, new Date(Date.now() + 31_000));
      expect(ticketA?.id).toBe(ticketB?.id);
      expect(notificationA?.id).toBe(notificationB?.id);
      expect(jobA).toBe(jobB);
    } finally {
      await db.delete(backgroundJobs).where(and(eq(backgroundJobs.organizationId, scope.organizationId), eq(backgroundJobs.conversationId, conversation.id), eq(backgroundJobs.type, "process_conversation"), sql`${backgroundJobs.dedupeKey} like ${`process:${conversation.id}:integration-dedupe-%`}`));
      await db.delete(notifications).where(and(eq(notifications.organizationId, scope.organizationId), eq(notifications.dedupeKey, key)));
      await db.delete(tickets).where(and(eq(tickets.organizationId, scope.organizationId), eq(tickets.idempotencyKey, key)));
      if (before) await db.update(conversations).set({ status: before.status, aiState: before.aiState, humanActive: before.humanActive }).where(eq(conversations.id, conversation.id));
    }
  });
});
