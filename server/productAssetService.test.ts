import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./nexareplyRepository", () => ({ nexareplyRepository: { listProductAssets: vi.fn(), createProductAsset: vi.fn() } }));

import { nexareplyRepository } from "./nexareplyRepository";
import { productAssetService } from "./productAssetService";
import { storagePut } from "./storage";

const scope = { organizationId: 441, role: "owner" as const, isDemo: false, actorUserId: 77 };

function png64Base64() {
  const header = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(header, 0);
  header.writeUInt32BE(13, 8);
  Buffer.from("IHDR").copy(header, 12);
  header.writeUInt32BE(64, 16);
  header.writeUInt32BE(64, 20);
  return header.toString("base64");
}

describe("productAssetService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nexareplyRepository.listProductAssets).mockResolvedValue([] as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "organizations/441/products/9/rose_abc123.png", url: "/manus-storage/organizations/441/products/9/rose_abc123.png" });
    vi.mocked(nexareplyRepository.createProductAsset).mockResolvedValue({ id: 1, productId: 9, organizationId: 441 } as never);
  });

  it("stores a verified image only under the authorized organization/product key", async () => {
    await expect(productAssetService.upload(scope, { productId: 9, base64: png64Base64(), fileName: "rose amber.png", mimeType: "image/png", altText: "Rose Amber bottle" })).resolves.toMatchObject({ id: 1, productId: 9 });
    expect(storagePut).toHaveBeenCalledWith(expect.stringMatching(/^organizations\/441\/products\/9\/rose-amber\.png$/), expect.any(Buffer), "image/png");
    expect(nexareplyRepository.createProductAsset).toHaveBeenCalledWith(scope, expect.objectContaining({ productId: 9, storageKey: expect.stringContaining("organizations/441/products/9"), width: 64, height: 64, mimeType: "image/png" }));
  });

  it("rejects MIME mismatch and never sends unverified bytes to storage", async () => {
    await expect(productAssetService.upload(scope, { productId: 9, base64: png64Base64(), fileName: "rose.jpg", mimeType: "image/jpeg" })).rejects.toThrow("JPEG, PNG ან WebP");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("enforces the six-image limit before writing to object storage", async () => {
    vi.mocked(nexareplyRepository.listProductAssets).mockResolvedValue(Array.from({ length: 6 }, (_, id) => ({ id })) as never);
    await expect(productAssetService.upload(scope, { productId: 9, base64: png64Base64(), fileName: "rose.png", mimeType: "image/png" })).rejects.toThrow("მაქსიმუმ 6 ფოტო");
    expect(storagePut).not.toHaveBeenCalled();
  });
});
