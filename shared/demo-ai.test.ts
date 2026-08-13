import { describe, expect, it } from "vitest";
import { createOwnerEvent, generateDemoReply } from "./demo-ai";

describe("generateDemoReply", () => {
  it("uses verified catalog facts for a known product", () => {
    const result = generateDemoReply({ history: [{ sender: "customer", body: "iPhone 16 Pro Max რა ღირს?" }], preferredProduct: "iPhone 16 Pro Max", tone: "თბილი და კონკრეტული" });
    expect(result.decision).toBe("suggest");
    expect(result.text).toContain("3,699 GEL");
    expect(result.source).toBe("catalog");
  });

  it("escalates instead of inventing an unknown answer", () => {
    const result = generateDemoReply({ history: [{ sender: "customer", body: "რა ღირს trade-in შეფასება?" }], preferredProduct: "trade-in", tone: "ფორმალური" });
    expect(result.decision).toBe("escalate");
    expect(result.text).toBe("ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით.");
  });

  it("blocks a reply while a human owns the conversation", () => {
    const result = generateDemoReply({ history: [{ sender: "customer", body: "დამეხმარეთ" }], preferredProduct: "iPhone 16 Pro Max", tone: "მოკლე და სწრაფი", humanActive: true });
    expect(result.decision).toBe("blocked");
    expect(result.text).toBe("");
  });
});

describe("createOwnerEvent", () => {
  it("creates a stable dedupe key for escalation alerts", () => {
    const event = createOwnerEvent("human_takeover", "c1", "ანა მჭედლიძე");
    expect(event.dedupeKey).toBe("human_takeover:c1");
    expect(event.title).toContain("ოპერატორის");
  });
});
