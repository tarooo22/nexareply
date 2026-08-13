import { and, eq } from "drizzle-orm";
import { conversations, draftOrders, knowledgeFacts, leads, messages, orderItems, organizations, productVariants, products } from "../drizzle/schema";
import { getDb } from "./db";
import { DEMO_SLUG, nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

const seedProducts = [
  ["Apple", "iPhone 16 Pro Max", "256GB", "შავი", "3699.00", 6, "0% / 12 თვე", "24 თვე"],
  ["Samsung", "Galaxy S25 Ultra", "256GB", "ტიტანის ლურჯი", "3299.00", 3, "0% / 12 თვე", "24 თვე"],
  ["Samsung", "Galaxy S25", "128GB", "ვერცხლისფერი", "2199.00", 11, "0% / 12 თვე", "24 თვე"],
  ["Google", "Pixel 9", "128GB", "ვარდისფერი", "2099.00", 7, "0% / 10 თვე", "24 თვე"],
  ["Xiaomi", "Xiaomi 15", "256GB", "თეთრი", "1899.00", 9, "0% / 12 თვე", "24 თვე"],
  ["OnePlus", "OnePlus 13", "256GB", "მწვანე", "2299.00", 4, "0% / 12 თვე", "24 თვე"],
  ["Nothing", "Nothing Phone 3", "256GB", "თეთრი", "1599.00", 8, "0% / 10 თვე", "24 თვე"],
  ["Apple", "AirPods Pro 2", "—", "თეთრი", "699.00", 14, "0% / 6 თვე", "12 თვე"],
] as const;

const seedFacts = [
  ["ფილიალი და სამუშაო საათები", "საბურთალო, ვაჟა-ფშაველას გამზირი 42. ორშაბათი–შაბათი 10:00–20:00, კვირა 11:00–18:00.", "hours"],
  ["მიწოდება", "თბილისში მიწოდება იმავე ან მომდევნო სამუშაო დღეს; რეგიონებში 1–3 სამუშაო დღე.", "delivery"],
  ["განვადება", "არჩეულ პროდუქტებზე მოქმედებს 0%-იანი განვადება 6–12 თვემდე. საბოლოო გადაწყვეტილებას ბანკი იღებს.", "installment"],
  ["დაბრუნება და გაცვლა", "დაუბნეველი პროდუქტი ბრუნდება მოქმედი წესებისა და დოკუმენტის პირობების შესაბამისად.", "policy"],
] as const;

const seedConversations = [
  { name: "ანა მჭედლიძე", phone: "+995 599 12 34 56", status: "open" as const, priority: "high" as const, product: "iPhone 16 Pro Max", stage: "qualified" as const, messages: [["customer", "iPhone 16 Pro Max გაქვთ?"], ["customer", "რამდენია?"], ["customer", "შავი ფერი მინდა"], ["ai", "iPhone 16 Pro Max 256GB შავი ფერი გვაქვს მარაგში. ფასი არის 3,699 GEL. ხელმისაწვდომია 0%-იანი განვადება 12 თვემდე."]] },
  { name: "გიორგი კაპანაძე", phone: "+995 577 20 19 12", status: "pending" as const, priority: "high" as const, product: "უცნობი შეფასება", stage: "new" as const, messages: [["customer", "trade-in რამდენს შემიფასებთ ჩემს ძველ ტელეფონს?"], ["ai", "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით."], ["system", "შეიქმნა ticket: საჭიროა ოპერატორი"]] },
  { name: "სალომე ბერიძე", phone: "+995 555 44 11 90", status: "pending" as const, priority: "normal" as const, product: "Samsung Galaxy S25", stage: "negotiating" as const, humanActive: true, messages: [["customer", "ფილიალიდან გატანა შეიძლება დღესვე?"], ["operator", "დიახ, საბურთალოს ფილიალიდან დღეს 20:00-მდე შეგიძლიათ გატანა."], ["system", "ადამიანმა ჩაიბარა საუბარი"]] },
  { name: "ლაშა აბაშიძე", phone: "+995 598 76 43 21", status: "open" as const, priority: "normal" as const, product: "Xiaomi 15", stage: "qualified" as const, messages: [["customer", "Xiaomi 15 განვადებით პირველ შენატანს ითხოვს?"], ["ai", "Xiaomi 15-ზე ხელმისაწვდომია 0%-იანი განვადება 12 თვემდე. დამატებითი პირობები დამოკიდებულია ბანკის გადაწყვეტილებაზე."]] },
  { name: "მარიამ ჯაფარიძე", phone: "+995 591 20 45 66", status: "closed" as const, priority: "normal" as const, product: "Google Pixel 9", stage: "draft_order" as const, messages: [["customer", "რუსთავში მიწოდება რამდენ ხანშია?"], ["ai", "რუსთავში მიწოდება ჩვეულებრივ 1 სამუშაო დღეში ხდება. მიწოდების მისამართი მოგვწერეთ და დეტალს დაგიდასტურებთ."]] },
  { name: "ნიკა კუბლაშვილი", phone: "+995 568 90 89 20", status: "open" as const, priority: "normal" as const, product: "OnePlus 13", stage: "new" as const, messages: [["customer", "OnePlus 13-ზე გარანტია რამდენია?"], ["ai", "OnePlus 13-ს აქვს 24-თვიანი ოფიციალური გარანტია TechZone Demo-ის პირობებით."]] },
] as const;

export async function seedTechZoneDemo() {
  const existing = await nexareplyRepository.getOrganizationBySlug(DEMO_SLUG);
  if (existing) return existing;
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const plan = await nexareplyRepository.ensurePlan();
  await db.insert(organizations).values({ name: "TechZone Demo", slug: DEMO_SLUG, mode: "demo", planId: plan.id, fallbackMessage: "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით." });
  const organization = (await db.select().from(organizations).where(eq(organizations.slug, DEMO_SLUG)).limit(1))[0];
  if (!organization) throw new Error("Demo organization seed failed");
  const scope: WorkspaceScope = { organizationId: organization.id, role: "owner", isDemo: true };
  for (const [brand, model, storage, color, priceGel, stock, installment, warranty] of seedProducts) {
    const sku = `${brand}-${model}`.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    await db.insert(products).values({ organizationId: organization.id, brand, model, sku });
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
    if (record.product === "უცნობი შეფასება") await db.insert(draftOrders).values({ organizationId: organization.id, leadId: lead.id, conversationId: conversation.id, customerName: record.name, status: "needs_confirmation", notes: "საჭიროა ოპერატორის შეფასება" });
  }
  await nexareplyRepository.ensureIntegrationStates(scope);
  await nexareplyRepository.ensureUsageCounter(scope, new Date().toISOString().slice(0, 7));
  return organization;
}
