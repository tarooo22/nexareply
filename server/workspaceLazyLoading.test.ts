import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("authenticated workspace lazy loading", () => {
  it("loads operational screens through a named-export lazy boundary", () => {
    const source = readFileSync(new URL("../client/src/pages/AuthenticatedWorkspace.tsx", import.meta.url), "utf8");
    expect(source).toContain('const module = await import("@/pages/workspace/AmadeoWorkspaceScreens");');
    expect(source).toContain('const WorkspaceInboxScreen = lazyWorkspaceScreen("WorkspaceInboxScreen");');
    expect(source).toContain('const WorkspaceCatalogScreen = lazyWorkspaceScreen("WorkspaceCatalogScreen");');
    expect(source).toContain('const WorkspaceSettingsScreen = lazyWorkspaceScreen("WorkspaceSettingsScreen");');
    expect(source).toContain('<Suspense fallback={<PanelLoading');
  });
});
