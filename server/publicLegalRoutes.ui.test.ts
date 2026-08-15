import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public legal routes", () => {
  const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("../client/src/pages/PublicPage.tsx", import.meta.url), "utf8");

  it("keeps Meta-compatible public privacy, terms, and data-deletion routes", () => {
    expect(appSource).toContain('path={"/privacy"}');
    expect(appSource).toContain('path={"/terms"}');
    expect(appSource).toContain('path={"/data-deletion"}');
    expect(pageSource).toContain('dataDeletion: {');
    expect(pageSource).toContain("Facebook Page token არასოდეს არის ხელმისაწვდომი browser-ში");
    expect(pageSource).toContain('href="/contact"');
  });
});
