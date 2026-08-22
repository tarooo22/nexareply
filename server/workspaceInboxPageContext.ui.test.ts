import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    nexareply: {
      workspace: {
        conversations: {
          list: { useQuery: () => ({ isLoading: false, isError: false, data: [{ id: 11, customerName: "ანა", customerPhone: null, preferredProduct: null, humanActive: false, aiState: "active", priority: "normal", lastMessageAt: new Date(), updatedAt: new Date(), preview: "ტესტი" }], refetch: vi.fn() }) },
          messages: { useQuery: () => ({ isLoading: false, data: [{ id: 1, sender: "ai", isDraft: true, deliveryStatus: "draft", body: "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით.", createdAt: new Date(), draftEvidence: [] }, { id: 2, sender: "operator", isDraft: false, deliveryStatus: "sent", body: "ოპერატორის პასუხი", createdAt: new Date(), draftEvidence: [] }], refetch: vi.fn() }) },
          context: { useQuery: () => ({ data: { customer: { hasMessengerIdentity: true }, activeTicket: null }, refetch: vi.fn() }) },
          createDraft: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false }) },
          takeover: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          handoff: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false }) },
          sendReply: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false }) },
        },
        owner: {
          meta: {
            status: {
              useQuery: () => ({ data: { status: "connected", page: { id: "page-1", name: "სარკე•Mirror" } } }),
            },
          },
        },
      },
    },
  },
}));

import { WorkspaceInboxScreen } from "../client/src/pages/workspace/AmadeoWorkspaceScreens";

describe("Workspace Inbox connected Page context", () => {
  it("shows the connected Page and makes outgoing AI/operator authors and delivery states explicit", () => {
    const markup = renderToStaticMarkup(createElement(WorkspaceInboxScreen, { organizationId: 17, role: "owner" }));

    expect(markup).toContain("აქტიური Facebook გვერდი: სარკე•Mirror");
    expect(markup).toContain("გვერდი: სარკე•Mirror");
    expect(markup).toContain("ავტორი: NexaReply AI · მონახაზი");
    expect(markup).toContain("ჯერ არ არის გაგზავნილი");
    expect(markup).toContain("უპასუხა: ოპერატორმა");
    expect(markup).toContain("Facebook გვერდიდან გაიგზავნა");
  });
});
