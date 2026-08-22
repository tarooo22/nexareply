import { describe, expect, it } from "vitest";
import { inboxDeliveryLabel, inboxMessageAuthorLabel } from "../client/src/lib/inboxPresentation";

describe("Inbox reply presentation", () => {
  it("makes the author of each customer, AI, operator, and system message explicit", () => {
    expect(inboxMessageAuthorLabel("customer", false)).toBe("მომწერი: კლიენტი");
    expect(inboxMessageAuthorLabel("ai", true)).toBe("ავტორი: NexaReply AI · მონახაზი");
    expect(inboxMessageAuthorLabel("operator", false)).toBe("უპასუხა: ოპერატორმა");
    expect(inboxMessageAuthorLabel("system", false)).toBe("სისტემური მოვლენა");
  });

  it("distinguishes unsent drafts from replies delivered through the Facebook Page", () => {
    expect(inboxDeliveryLabel("draft")).toBe("ჯერ არ არის გაგზავნილი");
    expect(inboxDeliveryLabel("sent")).toBe("Facebook გვერდიდან გაიგზავნა");
    expect(inboxDeliveryLabel("failed")).toBe("გაგზავნა ვერ მოხერხდა");
  });
});
