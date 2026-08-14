import * as XLSX from "xlsx";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

type RawRow = Record<string, unknown>;
export type CatalogMapping = {
  brand: string; fragranceName?: string; model?: string; sku: string; priceGel: string; stock: string;
  availability?: string; color?: string; volume?: string; storage?: string; description?: string;
  installment?: string; warranty?: string;
};
export type ValidCatalogRow = { brand: string; fragranceName: string; sku: string; priceGel: string; stock: number; availability: string; volume: string; description: string };

const defaultMapping: CatalogMapping = {
  brand: "ბრენდი", fragranceName: "სურნელის დასახელება", sku: "SKU", priceGel: "ფასი GEL", stock: "მარაგი",
  availability: "ხელმისაწვდომობა", volume: "მოცულობა", description: "აღწერა",
};

function readCell(row: RawRow, header: string | undefined) {
  if (!header) return "";
  const foundKey = Object.keys(row).find((key) => key.trim().toLocaleLowerCase("ka-GE") === header.trim().toLocaleLowerCase("ka-GE"));
  return String(foundKey ? row[foundKey] ?? "" : "").trim();
}

function parseNumber(value: string) {
  const normalized = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function rowValue(row: RawRow, primary: string | undefined, legacy: string | undefined) {
  return readCell(row, primary) || readCell(row, legacy);
}

export function parseCatalogFile(base64: string, fileName: string, mapping: CatalogMapping = defaultMapping) {
  const buffer = Buffer.from(base64, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error("ფაილში სამუშაო ფურცელი ვერ მოიძებნა.");
  const rawRows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "" });
  if (!rawRows.length) throw new Error("ფაილი ცარიელია.");
  const validRows: ValidCatalogRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  rawRows.forEach((raw: RawRow, index: number) => {
    const brand = readCell(raw, mapping.brand);
    const fragranceName = rowValue(raw, mapping.fragranceName, mapping.model);
    const sku = readCell(raw, mapping.sku);
    const priceInput = readCell(raw, mapping.priceGel);
    const stockInput = readCell(raw, mapping.stock);
    const price = parseNumber(priceInput);
    const stock = parseNumber(stockInput);
    const missing = [!brand && "ბრენდი", !fragranceName && "სურნელის დასახელება", !sku && "SKU", !priceInput && "ფასი GEL", !stockInput && "მარაგი"].filter(Boolean);
    if (missing.length) { errors.push({ row: index + 2, message: `აკლია: ${missing.join(", ")}` }); return; }
    if (!Number.isFinite(price) || price < 0) { errors.push({ row: index + 2, message: "ფასი GEL უნდა იყოს არაუარყოფითი რიცხვი" }); return; }
    if (!Number.isInteger(stock) || stock < 0) { errors.push({ row: index + 2, message: "მარაგი უნდა იყოს არაუარყოფითი მთელი რიცხვი" }); return; }
    validRows.push({
      brand, fragranceName, sku, priceGel: price.toFixed(2), stock,
      availability: rowValue(raw, mapping.availability, mapping.color) || (stock > 0 ? "მარაგშია" : "არ არის მარაგში"),
      volume: rowValue(raw, mapping.volume, mapping.storage) || "მოცულობა არ არის მითითებული",
      description: readCell(raw, mapping.description) || "აღწერა ჯერ არ არის მითითებული.",
    });
  });
  return { fileName, format: fileName.toLowerCase().endsWith(".xlsx") ? "xlsx" as const : "csv" as const, totalRows: rawRows.length, validRows, errors };
}

export async function previewCatalogImport(scope: WorkspaceScope, input: { base64: string; fileName: string; mapping?: CatalogMapping }) {
  const parsed = parseCatalogFile(input.base64, input.fileName, input.mapping);
  const importId = await nexareplyRepository.createProductImport(scope, { fileName: parsed.fileName, format: parsed.format, status: "preview", validRows: parsed.validRows.length, invalidRows: parsed.errors.length, errors: parsed.errors });
  return { importId, totalRows: parsed.totalRows, validRows: parsed.validRows, errors: parsed.errors };
}

export async function commitCatalogImport(scope: WorkspaceScope, input: { base64: string; fileName: string; mapping?: CatalogMapping }) {
  const parsed = parseCatalogFile(input.base64, input.fileName, input.mapping);
  const importId = await nexareplyRepository.createProductImport(scope, { fileName: parsed.fileName, format: parsed.format, status: "preview", validRows: parsed.validRows.length, invalidRows: parsed.errors.length, errors: parsed.errors });
  let imported = 0;
  const commitErrors = [...parsed.errors];
  for (const row of parsed.validRows) {
    try { await nexareplyRepository.createProduct(scope, row); imported += 1; }
    catch (error) { commitErrors.push({ row: imported + commitErrors.length + 2, message: error instanceof Error ? error.message : "მონაცემის შენახვა ვერ მოხერხდა" }); }
  }
  await nexareplyRepository.finishProductImport(scope, importId, imported, commitErrors);
  return { importId, imported, invalidRows: commitErrors.length, errors: commitErrors };
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function exportSalesCsv(scope: WorkspaceScope, kind: "leads" | "orders" | "products") {
  if (kind === "leads") {
    const rows = await nexareplyRepository.listLeads(scope);
    const header = ["სახელი", "ტელეფონი", "წყარო", "ეტაპი", "პრიორიტეტი", "პროდუქტის ინტერესი", "შექმნილია"];
    const body = rows.map((row) => [row.name, row.phone, row.source, row.stage, row.priority, row.preferredProduct, row.createdAt.toISOString()]);
    return [header, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
  }
  if (kind === "orders") {
    const orders = await nexareplyRepository.listDraftOrders(scope);
    const header = ["კლიენტი", "სტატუსი", "შენიშვნა", "შექმნილია"];
    const body = orders.map((row) => [row.customerName, row.status, row.notes, row.createdAt.toISOString()]);
    return [header, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
  }
  const rows = await nexareplyRepository.listProducts(scope);
  const header = ["ბრენდი", "სურნელის დასახელება", "SKU", "მოცულობა", "ფასი GEL", "მარაგი", "ხელმისაწვდომობა", "აღწერა"];
  const body = rows.map(({ product, variant }) => [product.brand, product.model, product.sku, variant.storage, variant.priceGel, variant.stock, variant.color, product.description]);
  return [header, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
}
