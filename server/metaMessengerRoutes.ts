import type { Express, Request, Response } from "express";
import express from "express";
import { metaMessengerService } from "./metaMessengerService";

function callbackPage(message: string, success: boolean) {
  const title = success ? "Meta authorization completed" : "Meta authorization could not be completed";
  return `<!doctype html><html lang="ka"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:3rem;max-width:40rem;margin:auto"><h1>${title}</h1><p>${message}</p><p>დაბრუნდით NexaReply workspace-ში და განაახლეთ Page-ების სია.</p></body></html>`;
}

export function registerMetaMessengerRoutes(app: Express) {
  app.get("/api/integrations/meta/webhook", (req: Request, res: Response) => {
    const challenge = metaMessengerService.verifyWebhookChallenge(req.query as Record<string, unknown>);
    if (!challenge) return res.sendStatus(403);
    return res.status(200).type("text/plain").send(challenge);
  });

  app.post("/api/integrations/meta/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const signature = req.header("x-hub-signature-256") ?? undefined;
    if (!metaMessengerService.verifyWebhookSignature(rawBody, signature)) return res.sendStatus(401);
    try {
      const payload = JSON.parse(rawBody.toString("utf8"));
      await metaMessengerService.handleWebhookPayload(payload);
      return res.status(200).type("text/plain").send("EVENT_RECEIVED");
    } catch (error) {
      console.error("[Meta] Webhook processing failed", error instanceof Error ? error.message : error);
      return res.status(500).json({ error: "meta_webhook_processing_failed" });
    }
  });

  app.get("/api/integrations/meta/callback", async (req: Request, res: Response) => {
    const input = {
      state: typeof req.query.state === "string" ? req.query.state : undefined,
      code: typeof req.query.code === "string" ? req.query.code : undefined,
      error: typeof req.query.error === "string" ? req.query.error : undefined,
    };
    const result = await metaMessengerService.handleOAuthCallback(input);
    return res.status(result.ok ? 200 : 400).type("html").send(callbackPage(result.message, result.ok));
  });
}
