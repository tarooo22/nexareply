import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsSource = readFileSync(new URL("../client/src/pages/demo/SettingsView.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");

describe("button interaction audit regressions", () => {
  it("keeps Demo Settings actions explicit instead of silent placeholders", () => {
    expect(settingsSource).not.toContain("Upgrade placeholder");
    expect(settingsSource).toContain("გეგმის განახლების ნახვა");
    expect(settingsSource).toContain("Setup ინსტრუქციის ნახვა");
    expect(settingsSource).toContain("რეალური billing/checkout ჯერ არ არის ჩართული");
    expect(settingsSource).toContain("რეალურ workspace-ში გახსენი Settings → Meta Messenger");
    expect(settingsSource).toContain('role="status"');
  });

  it("keeps the shared account dropdown trigger safe inside forms and accessible", () => {
    expect(layoutSource).toContain('type="button"');
    expect(layoutSource).toContain("ანგარიშისა და პროფილის მენიუს გახსნა");
  });
});
