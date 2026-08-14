import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + padding, "base64");
}

export function readMetaTokenVaultKey(value = process.env.META_TOKEN_ENCRYPTION_KEY) {
  if (!value?.trim()) throw new Error("META_TOKEN_ENCRYPTION_KEY is not configured.");
  const key = decodeBase64Url(value.trim());
  if (key.length !== 32) throw new Error("META_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function sealMetaPageToken(plainText: string, key = readMetaTokenVaultKey()) {
  if (!plainText) throw new Error("Meta Page token cannot be empty.");
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function openMetaPageToken(sealed: string, key = readMetaTokenVaultKey()) {
  const payload = decodeBase64Url(sealed);
  if (payload.length <= IV_BYTES + AUTH_TAG_BYTES) throw new Error("Encrypted Meta token payload is invalid.");
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
