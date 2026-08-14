import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

const scenario = vi.hoisted(() => ({ role: "owner" as "owner" | "operator" }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, name: "Test User" }, loading: false, isAuthenticated: true }) }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    nexareply: {
      workspace: {
        bootstrap: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false }) },
        organizations: { useQuery: () => ({ isLoading: false, data: [{ organization: { id: 17, name: "Persisted Org" }, membership: { role: scenario.role } }] }) },
      },
    },
  },
}));

import AuthenticatedWorkspace from "../client/src/pages/AuthenticatedWorkspace";

describe("AuthenticatedWorkspace persisted membership integration", () => {
  it("derives owner and operator navigation from workspace.organizations membership", () => {
    scenario.role = "owner";
    const ownerMarkup = renderToStaticMarkup(createElement(AuthenticatedWorkspace));
    scenario.role = "operator";
    const operatorMarkup = renderToStaticMarkup(createElement(AuthenticatedWorkspace));
    expect(ownerMarkup).toContain("Persisted Org");
    expect(ownerMarkup).toContain("წევრები");
    expect(operatorMarkup).toContain("Persisted Org");
    expect(operatorMarkup).not.toContain("წევრები");
    expect(operatorMarkup).not.toContain("ინტეგრაციები");
  });
});
