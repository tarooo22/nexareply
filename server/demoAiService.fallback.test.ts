import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabaseBackedDemoDraft } from "./demoAiService";
import { nexareplyRepository } from "./nexareplyRepository";

const scope = { organizationId: 91, role: "owner" as const, isDemo: false, actorUserId: 7 };

describe("AI fallback copy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(nexareplyRepository, "getConversation").mockResolvedValue({ id: 11, humanActive: false, aiState: "active", priority: "normal", customerName: "ანა" } as never);
    vi.spyOn(nexareplyRepository, "listMessages").mockResolvedValue([{ sender: "customer", body: "უცნობი დეტალი" }] as never);
    vi.spyOn(nexareplyRepository, "getOrganization").mockResolvedValue({ fallbackMessage: null } as never);
    vi.spyOn(nexareplyRepository, "listCatalogFacts").mockResolvedValue([] as never);
    vi.spyOn(nexareplyRepository, "listKnowledgeFacts").mockResolvedValue([] as never);
    vi.spyOn(nexareplyRepository, "createTicketOnce").mockResolvedValue({ id: 1 } as never);
    vi.spyOn(nexareplyRepository, "createNotificationOnce").mockResolvedValue({ id: 1 } as never);
    vi.spyOn(nexareplyRepository, "pauseAiForNeedsHuman").mockResolvedValue(undefined);
    vi.spyOn(nexareplyRepository, "addAudit").mockResolvedValue(undefined);
  });

  it("uses a tenant-neutral holding reply and escalation notification when no verified fact matches", async () => {
    const addMessage = vi.spyOn(nexareplyRepository, "addMessage").mockResolvedValue(undefined);
    const notify = vi.mocked(nexareplyRepository.createNotificationOnce);

    await expect(createDatabaseBackedDemoDraft(scope, 11)).resolves.toMatchObject({ decision: "needs_human", source: "fallback" });

    expect(addMessage).toHaveBeenCalledWith(scope, expect.objectContaining({ body: "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით." }));
    expect(notify).toHaveBeenCalledWith(scope, expect.objectContaining({ body: expect.not.stringMatching(/amadeo/i) }));
  });
});
