import { describe, expect, it } from "vitest";
import { requireWorkspaceRole } from "./workspaceAuthorization";

describe("requireWorkspaceRole", () => {
  it("permits an owner on an owner-only operation", () => {
    expect(() => requireWorkspaceRole("owner")).not.toThrow();
  });

  it("blocks an operator on an owner-only operation", () => {
    expect(() => requireWorkspaceRole("operator")).toThrow(/მფლობელისთვის/);
  });
});
