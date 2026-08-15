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
    expect(ownerMarkup).toContain("პარამეტრები");
    expect(operatorMarkup).not.toContain("წევრები");
    expect(operatorMarkup).not.toContain("ინტეგრაციები");
    expect(operatorMarkup).not.toContain("პარამეტრები");
  });

  it("uses a grouped vertical navigation that can be placed inside an accessible mobile drawer", () => {
    const markup = renderToStaticMarkup(createElement(WorkspaceNav, { role: "owner", active: "overview", onSelect: () => undefined }));
    expect(markup).toContain("სამუშაო სივრცე");
    expect(markup).toContain("ცოდნა და გაყიდვები");
    expect(markup).toContain("ავტომატიზაცია");
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain("overflow-x-auto");
  });
});
