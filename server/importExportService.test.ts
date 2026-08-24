import * as XLSX from "xlsx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commitCatalogImport, parseCatalogFile } from "./importExportService";
import { nexareplyRepository } from "./nexareplyRepository";

function workbookBase64(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Catalog");
  return XLSX.write(book, { type: "base64", bookType: "xlsx" });
}

describe("parseCatalogFile", () => {
  it("returns normalized, valid catalog rows from XLSX data", () => {
    const base64 = workbookBase64([{ "ბრენდი": "Maison Test", "სურნელის დასახელება": "Rose Amber", SKU: "AMAD-ROSE", "ფასი GEL": "199", მარაგი: 4, ხელმისაწვდომობა: "მარაგშია", მოცულობა: "50 მლ", აღწერა: "ყვავილოვანი სურნელი" }]);
    const parsed = parseCatalogFile(base64, "catalog.xlsx");
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.validRows).toEqual([expect.objectContaining({ brand: "Maison Test", fragranceName: "Rose Amber", sku: "AMAD-ROSE", priceGel: "199.00", stock: 4, volume: "50 მლ" })]);
  });

  it("reports missing required fields instead of persisting malformed rows", () => {
    const base64 = workbookBase64([{ "ბრენდი": "Maison Test", "სურნელის დასახელება": "Missing SKU", "ფასი GEL": "199", მარაგი: 4 }]);
    const parsed = parseCatalogFile(base64, "catalog.xlsx");
    expect(parsed.validRows).toHaveLength(0);
    expect(parsed.errors[0]).toMatchObject({ row: 2 });
    expect(parsed.errors[0]?.message).toContain("SKU");
  });
});

describe("commitCatalogImport", () => {
  const scope = { organizationId: 17, role: "owner" as const, isDemo: false, actorUserId: 9 };
  afterEach(() => vi.restoreAllMocks());

  it("reuses a completed preview record without creating or updating products again", async () => {
    const base64 = workbookBase64([{ "ბრენდი": "Maison Test", "სურნელის დასახელება": "Rose Amber", SKU: "AMAD-ROSE", "ფასი GEL": "199", მარაგი: 4 }]);
    vi.spyOn(nexareplyRepository, "getProductImport").mockResolvedValue({ id: 88, organizationId: 17, fileName: "catalog.xlsx", status: "completed", validRows: 1, invalidRows: 0, errors: [] } as never);
    const create = vi.spyOn(nexareplyRepository, "createProduct");
    const update = vi.spyOn(nexareplyRepository, "updateProduct");

    await expect(commitCatalogImport(scope, { base64, fileName: "catalog.xlsx", importId: 88 })).resolves.toMatchObject({ importId: 88, imported: 1, alreadyCommitted: true });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the matching tenant SKU rather than creating a duplicate during a preview commit", async () => {
    const base64 = workbookBase64([{ "ბრენდი": "Maison Test", "სურნელის დასახელება": "Rose Amber", SKU: "AMAD-ROSE", "ფასი GEL": "199", მარაგი: 4 }]);
    vi.spyOn(nexareplyRepository, "getProductImport").mockResolvedValue({ id: 89, organizationId: 17, fileName: "catalog.xlsx", status: "preview", validRows: 1, invalidRows: 0, errors: [] } as never);
    vi.spyOn(nexareplyRepository, "getProductBySku").mockResolvedValue({ id: 25, organizationId: 17, sku: "AMAD-ROSE" } as never);
    const update = vi.spyOn(nexareplyRepository, "updateProduct").mockResolvedValue(undefined);
    const finish = vi.spyOn(nexareplyRepository, "finishProductImport").mockResolvedValue(undefined);

    await expect(commitCatalogImport(scope, { base64, fileName: "catalog.xlsx", importId: 89 })).resolves.toMatchObject({ importId: 89, created: 0, updated: 1, imported: 1, alreadyCommitted: false });
    expect(update).toHaveBeenCalledWith(scope, 25, expect.objectContaining({ sku: "AMAD-ROSE", stock: 4 }));
    expect(finish).toHaveBeenCalledWith(scope, 89, 1, []);
  });
});
