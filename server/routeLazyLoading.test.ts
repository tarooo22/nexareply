import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("route-level lazy loading", () => {
  it("keeps non-home routes behind React lazy imports", () => {
    const source = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    expect(source).toContain('const PublicPage = lazy(() => import("./pages/PublicPage"));');
    expect(source).toContain('const InvitationAccept = lazy(() => import("./pages/InvitationAccept"));');
    expect(source).toContain('const AuthPage = lazy(() => import("./pages/AuthPage"));');
    expect(source).toContain('const NotFound = lazy(() => import("./pages/NotFound"));');
    expect(source).toContain("<Suspense fallback=");
  });
});
