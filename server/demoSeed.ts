import { and, eq } from "drizzle-orm";
import { conversations, draftOrders, knowledgeFacts, leads, messages, orderItems, organizations, productVariants, products } from "../drizzle/schema";
import { getDb } from "./db";
import { DEMO_SLUG, nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

const seedProducts = [
  ["Amadeo Demo", "Rose Amber", "50 მლ", "მარაგშია", "159.00", 7, "დემო ფასი", "სადემონსტრაციო ჩანაწერი"],
  ["Amadeo Demo", "Vanilla Noir", "100 მლ", "მარაგშია", "189.00", 4, "დემო ფასი", "სადემონსტრაციო ჩანაწერი"],
  ["Amadeo Demo", "Citrus Atelier", "50 მლ", "შეზღუდული მარაგი", "139.00", 2, "დემო ფასი", "სადემონსტრაციო ჩანაწერი"],
] as const;

const seedFacts = [
  ["Demo მიწოდების წესი", "ეს არის საჯარო დემო მონაცემი: რეალურ Amadeo workspace-ში დაამატეთ დადასტურებული მიწოდების პირობები.", "delivery"],
  ["Demo გადახდის წესი", "ეს არის საჯარო დემო მონაცემი: რეალური გადახდის პირობები შეავსეთ დაცული ცოდნის ბაზაში.", "payment"],
  ["Demo ორიგინალობის წესი", "ეს არის საჯარო დემო მონაცემი: რეალური authenticity policy დაამატეთ დაცულ workspace-ში.", "authenticity"],
  ["Demo დაბრუნების წესი", "ეს არის საჯარო დემო მონაცემი: რეალური დაბრუნების პირობები დაადასტურეთ owner panel-ში.", "returns"],
] as const;

const seedConversations = [
  { name: "ანა მჭედლიძე", phone: "+995 599 12 34 56", status: "open" as const, priority: "high" as const, product: "Rose Amber", stage: "qualified" as const, messages: [["customer", "Rose Amber რა მოცულობით გაქვთ?"], ["ai", "Rose Amber 50 მლ-ის დემო ჩანაწერი კატალოგშია. რეალურ Amadeo workspace-ში გადაამოწმეთ მიმდინარე მარაგი და ფასი."]] },
  { name: "გიორგი კაპანაძე", phone: "+995 577 20 19 12", status: "pending" as const, priority: "high" as const, product: "უცნობი სუნამო", stage: "new" as const, messages: [["customer", "ჩემი აღწერით რომელი სუნამოა?"], ["ai", "ზუსტ დეტალს Amadeo-ის გუნდთან გადავამოწმებ და მალე დაგიბრუნდებით."], ["system", "შეიქმნა ticket: საჭიროა ოპერატორი"]] },
  { name: "სალომე ბერიძე", phone: "+995 555 44 11 90", status: "pending" as const, priority: "normal" as const, product: "Vanilla Noir", stage: "negotiating" as const, humanActive: true, messages: [["customer", "ორიგინალობის პირობები სად ვნახო?"], ["operator", "დადასტურებულ policy-ს მალე მოგაწვდით."], ["system", "ადამიანმა ჩაიბარა საუბარი"]] },
  { name: "მარიამ ჯაფარიძე", phone: "+995 591 20 45 66", status: "closed" as const, priority: "normal" as const, product: "Citrus Atelier", stage: "draft_order" as const, messages: [["customer", "მიწოდების პირობები მაინტერესებს."], ["ai", "მიწოდების დადასტურებულ წესს Amadeo-ის ცოდნის ბაზიდან შეგატყობინებთ."]] },
] as const;

export async function seedAmadeoDemo() {
  const existing = await nexareplyRepository.getOrganizationBySlug(DEMO_SLUG);
  if (existing) return existing;
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const plan = await nexareplyRepository.ensurePlan();
  await db.insert(organizations).values({ name: "Amadeo Demo", slug: DEMO_SLUG, mode: "demo", planId: plan.id, aiPersona: "Amadeo Demo სუნამოების კონსულტანტი", fallbackMessage: "ზუსტ დეტალს Amadeo-ის გუნდთან გადავამოწმებ და მალე დაგიბრუნდებით." });
  const organization = (await db.select().from(organizations).where(eq(organizations.slug, DEMO_SLUG)).limit(1))[0];
  if (!organization) throw new Error("Demo organization seed failed");
  const scope: WorkspaceScope = { organizationId: organization.id, role: "owner", isDemo: true };
  for (const [brand, model, storage, color, priceGel, stock, installment, warranty] of seedProducts) {
    const sku = `${brand}-${model}`.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    await db.insert(products).values({ organizationId: organization.id, brand, model, sku, category: "სუნამო", description: "ეს არის საჯარო დემო catalog ჩანაწერი და არა რეალური მაღაზიის მარაგი." });
    const product = (await db.select().from(products).where(and(eq(products.organizationId, organization.id), eq(products.sku, sku))).limit(1))[0]!;
    await db.insert(productVariants).values({ organizationId: organization.id, productId: product.id, sku: `${sku}-default`, storage, color, priceGel, stock, installment, warranty });
  }
  for (const [title, body, category] of seedFacts) await db.insert(knowledgeFacts).values({ organizationId: organization.id, title, body, category });
  for (const record of seedConversations) {
    await db.insert(leads).values({ organizationId: organization.id, name: record.name, phone: record.phone, priority: record.priority, stage: record.stage, preferredProduct: record.product });
    const lead = (await db.select().from(leads).where(and(eq(leads.organizationId, organization.id), eq(leads.phone, record.phone))).limit(1))[0]!;
    const latest = record.messages.at(-1)?.[1] ?? "";
    const humanActive = "humanActive" in record && record.humanActive === true;
    await db.insert(conversations).values({ organizationId: organization.id, leadId: lead.id, customerName: record.name, customerPhone: record.phone, status: record.status, priority: record.priority, preferredProduct: record.product, preview: latest, humanActive, aiState: humanActive ? "paused" : "active", lastMessageAt: new Date() });
    const conversation = (await db.select().from(conversations).where(and(eq(conversations.organizationId, organization.id), eq(conversations.customerPhone, record.phone))).limit(1))[0]!;
    for (const [sender, body] of record.messages) await db.insert(messages).values({ organizationId: organization.id, conversationId: conversation.id, sender: sender as "customer" | "ai" | "operator" | "system", body, source: "demo" });
    if (record.product === "უცნობი სუნამო") await db.insert(draftOrders).values({ organizationId: organization.id, leadId: lead.id, conversationId: conversation.id, customerName: record.name, status: "needs_confirmation", notes: "საჭიროა ოპერატორის დაზუსტება" });
  }
  await nexareplyRepository.ensureIntegrationStates(scope);
  await nexareplyRepository.ensureUsageCounter(scope, new Date().toISOString().slice(0, 7));
  return organization;
}
