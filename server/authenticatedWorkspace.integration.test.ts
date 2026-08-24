import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../client/src/contexts/ThemeContext";

const scenario = vi.hoisted(() => ({ role: "owner" as "owner" | "operator", organizations: [{ organization: { id: 17, name: "Persisted Org" }, membership: { role: "owner" as "owner" | "operator" } }] }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, name: "Test User" }, loading: false, isAuthenticated: true }) }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    nexareply: {
      workspace: {
        bootstrap: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false }) },
        organizations: { useQuery: () => ({ isLoading: false, isError: false, refetch: vi.fn(), data: scenario.organizations.map((entry) => ({ ...entry, membership: { role: scenario.role } })) }) },
        createOrganization: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
        memberships: {
          list: { useQuery: () => ({ isLoading: false, isError: false, refetch: vi.fn(), data: [{ membership: { id: 1, role: "owner" }, user: { id: 7, name: "Test User", email: "test@example.com" } }] }) },
          setRole: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
          invitations: {
            list: { useQuery: () => ({ isLoading: false, isError: false, refetch: vi.fn(), data: [{ id: 31, email: "operator@example.com", role: "operator", status: "pending", deliveryStatus: "manual_ready", expiresAt: new Date("2026-09-01T12:00:00.000Z") }] }) },
            create: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) },
            cancel: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
            resend: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          },
        },
        overview: { useQuery: () => ({ isLoading: false, data: { conversationCount: 0, ticketCount: 0, qualifiedLeadCount: 0 } }) },
        onboarding: {
          state: { useQuery: () => ({ isLoading: false, data: { dismissedAt: new Date(), assistantReviewedAt: null, workerReady: false, completedCount: 0, totalActionableSteps: 5, steps: { channelConnected: false, knowledgeReady: false, catalogReady: false, assistantReviewed: false, testDraftReady: false } } }) },
          dismiss: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
          restart: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        },
        analytics: { useQuery: () => ({ isLoading: false, data: { conversationCount: 0, aiReplies: 0, humanReplies: 0, qualifiedLeads: 0, handoffs: 0, draftOrderCount: 0, responseRate: 0, dailyVolume: [] } }) },
        notifications: { list: { useQuery: () => ({ isLoading: false, data: [] }) }, markRead: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
        owner: { accountDeletion: { list: { useQuery: () => ({ isLoading: false, data: [], refetch: vi.fn() }) }, request: { useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }) } }, meta: { status: { useQuery: () => ({ isLoading: false, data: { status: "connected", configured: true, page: { id: "page", name: "Amadeo" } } }) } } },
      },
    },
  },
}));

import AuthenticatedWorkspace, { MembersPanel } from "../client/src/pages/AuthenticatedWorkspace";

describe("AuthenticatedWorkspace persisted membership integration", () => {
  it("derives owner and operator navigation from workspace.organizations membership", () => {
    scenario.role = "owner";
    const ownerMarkup = renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "light" }, createElement(AuthenticatedWorkspace)));
    scenario.role = "operator";
    const operatorMarkup = renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "light" }, createElement(AuthenticatedWorkspace)));
    expect(ownerMarkup).toContain("Persisted Org");
    expect(ownerMarkup).toContain("წევრები");
    expect(ownerMarkup).toContain("Workspace მენიუს გახსნა");
    expect(ownerMarkup).toContain("ახალი workspace");
    expect(ownerMarkup).toContain("lg:hidden");
    expect(ownerMarkup).toContain("lg:flex");
    expect(operatorMarkup).toContain("Persisted Org");
    expect(operatorMarkup).not.toContain("წევრები");
    expect(operatorMarkup).not.toContain("ინტეგრაციები");
  });

  it("shows an explicit named-workspace creation state for a fresh authenticated user instead of auto-bootstrapping a generic organization", () => {
    scenario.organizations = [];
    const markup = renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "light" }, createElement(AuthenticatedWorkspace)));
    expect(markup).toContain("შექმენი პირველი workspace");
    expect(markup).toContain("Workspace-ის სახელი");
    expect(markup).toContain("Facebook Page-ს ამ ნაბიჯზე არ ვაკავშირებთ");
    expect(markup).not.toContain("Persisted Org");
    scenario.organizations = [{ organization: { id: 17, name: "Persisted Org" }, membership: { role: "owner" } }];
  });

  it("shows owner invitation lifecycle state and recovery actions without exposing provider credentials", () => {
    const markup = renderToStaticMarkup(createElement(ThemeProvider, { defaultTheme: "light" }, createElement(MembersPanel, { organizationId: 17 })));
    expect(markup).toContain("მოწვევების ისტორია");
    expect(markup).toContain("operator@example.com");
    expect(markup).toContain("ბმულის ხელით გაზიარება");
    expect(markup).toContain("ხელახლა გაგზავნა");
    expect(markup).toContain("გაუქმება");
    expect(markup).not.toMatch(/resend_api_key|providerMessageId|access_token/i);
  });
});
