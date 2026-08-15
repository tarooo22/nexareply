import type { Express, Request, Response } from "express";
import express from "express";
import { metaMessengerService } from "./metaMessengerService";

function callbackPage(input: { success: boolean; sessionId?: string }) {
  const fragment = input.sessionId
    ? `meta_oauth_session=${encodeURIComponent(input.sessionId)}&meta_oauth_result=${input.success ? "ready" : "failed"}`
    : `meta_oauth_result=${input.success ? "ready" : "failed"}`;
  const title = input.success ? "Meta authorization completed" : "Meta authorization could not be completed";
  return `<!doctype html><html lang="ka"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:3rem;max-width:40rem;margin:auto"><h1>${title}</h1><p>${input.success ? "ავტორიზაცია დასრულდა. Page-ის არჩევაზე გადაგამისამართებთ." : "ავტორიზაცია ვერ დასრულდა. Workspace-ში დაბრუნების შემდეგ ნახავთ უსაფრთხო recovery მდგომარეობას."}</p><p>თუ გადამისამართება ავტომატურად არ შესრულდა, გახსენით <a href="/app#${fragment}">NexaReply Workspace</a>.</p><script>window.location.replace("/app#${fragment}");</script></body></html>`;
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

  app.post("/api/integrations/meta/deauthorize", express.urlencoded({ extended: false, limit: "50kb" }), (req: Request, res: Response) => {
    const signedRequest = typeof req.body?.signed_request === "string" ? req.body.signed_request : "";
    const result = metaMessengerService.handleDeauthorization(signedRequest);
    if (!result.ok) return res.sendStatus(result.reason === "unconfigured" ? 503 : 400);
    return res.status(200).json({ success: true, confirmation_code: result.confirmationCode });
  });

  app.post("/api/integrations/meta/data-deletion", express.urlencoded({ extended: false, limit: "50kb" }), (req: Request, res: Response) => {
    const signedRequest = typeof req.body?.signed_request === "string" ? req.body.signed_request : "";
    const result = metaMessengerService.handleDataDeletionRequest(signedRequest);
    if (!result.ok) return res.sendStatus(result.reason === "unconfigured" ? 503 : 400);
    return res.status(200).json({ url: result.url, confirmation_code: result.confirmationCode });
  });

  app.get("/api/integrations/meta/callback", async (req: Request, res: Response) => {
    const input = {
      state: typeof req.query.state === "string" ? req.query.state : undefined,
      code: typeof req.query.code === "string" ? req.query.code : undefined,
      error: typeof req.query.error === "string" ? req.query.error : undefined,
    };
    const result = await metaMessengerService.handleOAuthCallback(input);
    return res.status(result.ok ? 200 : 400).type("html").send(callbackPage({ success: result.ok, sessionId: result.sessionId }));
  });
}
