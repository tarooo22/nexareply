import { imageSize } from "image-size";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";
import { storagePut } from "./storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 6;
const MAX_DIMENSION = 6000;
const MAX_PIXELS = 20_000_000;
const MIME_BY_TYPE: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type ProductImageUpload = {
  productId: number;
  base64: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  altText?: string;
};

function decodeBase64(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error("ფაილის კოდირება არასწორია.");
  const buffer = Buffer.from(value, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error("ფოტოს ზომა უნდა იყოს არაუმეტეს 5 MB.");
  return buffer;
}

function verifiedImage(buffer: Buffer, claimedMimeType: string) {
  const dimensions = imageSize(buffer);
  const type = dimensions.type?.toLowerCase();
  const mimeType = type ? MIME_BY_TYPE[type] : undefined;
  if (!mimeType || mimeType !== claimedMimeType) throw new Error("ატვირთეთ მხოლოდ JPEG, PNG ან WebP გამოსახულება სწორი ფაილის ტიპით.");
  if (!dimensions.width || !dimensions.height || dimensions.width < 64 || dimensions.height < 64) throw new Error("ფოტოს მინიმალური ზომაა 64 × 64 px.");
  if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION || dimensions.width * dimensions.height > MAX_PIXELS) throw new Error("ფოტოს dimensions აღემატება უსაფრთხო ლიმიტს.");
  return { mimeType, width: dimensions.width, height: dimensions.height };
}

function normalizedStem(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return stem || "product-image";
}

export const productAssetService = {
  async upload(scope: WorkspaceScope, input: ProductImageUpload) {
    const activeAssets = await nexareplyRepository.listProductAssets(scope, input.productId);
    if (activeAssets.length >= MAX_IMAGES_PER_PRODUCT) throw new Error("ერთ პროდუქტს მაქსიმუმ 6 ფოტო შეიძლება ჰქონდეს.");
    const buffer = decodeBase64(input.base64);
    const verified = verifiedImage(buffer, input.mimeType);
    const extension = verified.mimeType === "image/jpeg" ? "jpg" : verified.mimeType.split("/")[1];
    const stored = await storagePut(
      `organizations/${scope.organizationId}/products/${input.productId}/${normalizedStem(input.fileName)}.${extension}`,
      buffer,
      verified.mimeType,
    );
    return nexareplyRepository.createProductAsset(scope, {
      productId: input.productId,
      storageKey: stored.key,
      mimeType: verified.mimeType,
      byteSize: buffer.byteLength,
      width: verified.width,
      height: verified.height,
      altText: input.altText?.trim() || null,
    });
  },
};
