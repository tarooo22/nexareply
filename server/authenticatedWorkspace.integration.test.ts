import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../client/src/contexts/ThemeContext";

const scenario = vi.hoisted(() => ({ role: "owner" as "owner" | "operator" }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, name: "Test User" }, loading: false, isAuthenticated: true }) }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    nexareply: {
      workspace: {
        bootstrap: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false }) },
        organizations: { useQuery: () => ({ isLoading: false, data: [{ organization: { id: 17, name: "Persisted Org" }, membership: { role: scenario.role } }] }) },
        overview: { useQuery: () => ({ isLoading: false, data: { conversationCount: 0, ticketCount: 0, qualifiedLeadCount: 0 } }) },
        onboarding: {
          state: { useQuery: () => ({ isLoading: false, data: { dismissedAt: new Date(), assistantReviewedAt: null, workerReady: false, completedCount: 0, totalActionableSteps: 5, steps: { channelConnected: false, knowledgeReady: false, catalogReady: false, assistantReviewed: false, testDraftReady: false } } }) },
          dismiss: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          restart: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        },
        analytics: { useQuery: () => ({ isLoading: false, data: { conversationCount: 0, aiReplies: 0, humanReplies: 0, qualifiedLeads: 0, handoffs: 0, draftOrderCount: 0, responseRate: 0, dailyVolume: [] } }) },
        notifications: { list: { useQuery: () => ({ isLoading: false, data: [] }) }, markRead: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
        owner: { meta: { status: { useQuery: () => ({ isLoading: false, data: { status: "connected", configured: true, page: { id: "page", name: "Amadeo" } } }) } } },
      },
    },
  },
}));

import AuthenticatedWorkspace from "../client/src/pages/AuthenticatedWorkspace";

describe("AuthenticatedWorkspace persisted membership integration", () => {
  it("derives owner and operator navigation from workspace.organizations membership", () => {
    scenario.role = "owner";
    const ownerMarkup = renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "light" }, createElement(AuthenticatedWorkspace)));
    scenario.role = "operator";
    const operatorMarkup = renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "light" }, createElement(AuthenticatedWorkspace)));
    expect(ownerMarkup).toContain("Persisted Org");
    expect(ownerMarkup).toContain("წევრები");
    expect(operatorMarkup).toContain("Persisted Org");
    expect(operatorMarkup).not.toContain("წევრები");
    expect(operatorMarkup).not.toContain("ინტეგრაციები");
  });
});
