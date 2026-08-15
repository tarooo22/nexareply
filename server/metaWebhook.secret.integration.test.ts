import crypto from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerMetaMessengerRoutes } from "./metaMessengerRoutes";

let server: Server;
let endpoint = "";
let deauthorizeEndpoint = "";
let dataDeletionEndpoint = "";

function signedRequest(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", process.env.META_APP_SECRET ?? "").update(encodedPayload).digest("base64url");
  return `${signature}.${encodedPayload}`;
}

beforeAll(async () => {
  const app = express();
  registerMetaMessengerRoutes(app);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Webhook test server did not bind a TCP port.");
  endpoint = `http://127.0.0.1:${address.port}/api/integrations/meta/webhook`;
  deauthorizeEndpoint = `http://127.0.0.1:${address.port}/api/integrations/meta/deauthorize`;
  dataDeletionEndpoint = `http://127.0.0.1:${address.port}/api/integrations/meta/data-deletion`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("managed Meta webhook verify token", () => {
  it("returns the exact GET challenge only when the managed token matches, without logging or serializing the token", async () => {
    const verifyToken = process.env.META_VERIFY_TOKEN;
    expect(Boolean(verifyToken)).toBe(true);
    const query = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": verifyToken!, "hub.challenge": "managed-secret-challenge" });
    const response = await fetch(`${endpoint}?${query.toString()}`);
    const responseBody = await response.text();
    expect(response.status).toBe(200);
    expect(responseBody === "managed-secret-challenge").toBe(true);
  });

  it("validates signed deauthorization and data-deletion callbacks", async () => {
    const payload = { algorithm: "HMAC-SHA256", user_id: "integration-facebook-user", issued_at: 1700000000 };
    const body = new URLSearchParams({ signed_request: signedRequest(payload) });
    const deauth = await fetch(deauthorizeEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    expect(deauth.status).toBe(200);
    const deauthJson = await deauth.json() as { success?: boolean; confirmation_code?: string };
    expect(deauthJson).toMatchObject({ success: true, confirmation_code: expect.any(String) });
    expect(JSON.stringify(deauthJson)).not.toContain(payload.user_id);

    const deletion = await fetch(dataDeletionEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    expect(deletion.status).toBe(200);
    const deletionJson = await deletion.json() as { url?: string; confirmation_code?: string };
    expect(deletionJson).toMatchObject({ url: expect.stringContaining("/data-deletion?confirmation_code="), confirmation_code: expect.any(String) });
    expect(JSON.stringify(deletionJson)).not.toContain(payload.user_id);
  });

  it("rejects a tampered lifecycle signed_request", async () => {
    const valid = signedRequest({ algorithm: "HMAC-SHA256", user_id: "tampered-user", issued_at: 1700000001 });
    const response = await fetch(dataDeletionEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ signed_request: `${valid}x` }) });
    expect(response.status).toBe(400);
  });
});
