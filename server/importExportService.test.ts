import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseCatalogFile } from "./importExportService";

function workbookBase64(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Catalog");
  return XLSX.write(book, { type: "base64", bookType: "xlsx" });
}

describe("parseCatalogFile", () => {
  it("returns normalized, valid catalog rows from XLSX data", () => {
    const base64 = workbookBase64([{ "ბრენდი": "Apple", "მოდელი": "iPhone Test", SKU: "APPLE-TEST", "ფასი GEL": "1999", მარაგი: 4, ფერი: "შავი", მეხსიერება: "128GB" }]);
    const parsed = parseCatalogFile(base64, "catalog.xlsx");
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.validRows).toEqual([expect.objectContaining({ brand: "Apple", model: "iPhone Test", sku: "APPLE-TEST", priceGel: "1999.00", stock: 4 })]);
  });

  it("reports missing required fields instead of persisting malformed rows", () => {
    const base64 = workbookBase64([{ "ბრენდი": "Apple", "მოდელი": "Missing SKU", "ფასი GEL": "1999", მარაგი: 4 }]);
    const parsed = parseCatalogFile(base64, "catalog.xlsx");
    expect(parsed.validRows).toHaveLength(0);
    expect(parsed.errors[0]).toMatchObject({ row: 2 });
    expect(parsed.errors[0]?.message).toContain("SKU");
  });
});
