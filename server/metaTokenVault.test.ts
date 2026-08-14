import { describe, expect, it } from "vitest";
import { openMetaPageToken, readMetaTokenVaultKey, sealMetaPageToken } from "./metaTokenVault";

describe("Meta token vault key readiness", () => {
  it("accepts the configured 32-byte key and encrypts/decrypts a server-only probe", () => {
    const key = readMetaTokenVaultKey();
    expect(key).toHaveLength(32);
    const sealed = sealMetaPageToken("vault-readiness-probe", key);
    expect(sealed).not.toContain("vault-readiness-probe");
    expect(openMetaPageToken(sealed, key)).toBe("vault-readiness-probe");
  });
});
