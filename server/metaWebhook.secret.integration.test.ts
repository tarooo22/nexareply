import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerMetaMessengerRoutes } from "./metaMessengerRoutes";

let server: Server;
let endpoint = "";

beforeAll(async () => {
  const app = express();
  registerMetaMessengerRoutes(app);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Webhook test server did not bind a TCP port.");
  endpoint = `http://127.0.0.1:${address.port}/api/integrations/meta/webhook`;
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
});
