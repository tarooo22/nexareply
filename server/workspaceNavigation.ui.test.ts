import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceNav } from "../client/src/components/WorkspaceNav";
import { createElement } from "react";

describe("WorkspaceNav membership-driven UI", () => {
  it("renders owner-only navigation for an owner and hides it for an operator", () => {
    const ownerMarkup = renderToStaticMarkup(createElement(WorkspaceNav, { role: "owner", active: "overview", onSelect: () => undefined }));
    const operatorMarkup = renderToStaticMarkup(createElement(WorkspaceNav, { role: "operator", active: "overview", onSelect: () => undefined }));
    expect(ownerMarkup).toContain("წევრები");
    expect(ownerMarkup).toContain("ინტეგრაციები");
    expect(operatorMarkup).not.toContain("წევრები");
    expect(operatorMarkup).not.toContain("ინტეგრაციები");
  });

  it("keeps the complete mobile navigation reachable without forcing a tall sidebar", () => {
    const markup = renderToStaticMarkup(createElement(WorkspaceNav, { role: "owner", active: "overview", onSelect: () => undefined }));
    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain("lg:grid");
    expect(markup).toContain("shrink-0");
  });
});
