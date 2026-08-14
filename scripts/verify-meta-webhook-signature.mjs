import crypto from "node:crypto";

const appSecret = process.env.META_APP_SECRET;
const endpoint = process.env.META_WEBHOOK_CHECK_URL || "https://nexareply-2chxuc4s.manus.space/api/integrations/meta/webhook";

if (!appSecret) {
  console.error("META_APP_SECRET is unavailable to this verification process.");
  process.exit(2);
}

const rawPayload = Buffer.from(JSON.stringify({ object: "page", entry: [] }), "utf8");
const signature = `sha256=${crypto.createHmac("sha256", appSecret).update(rawPayload).digest("hex")}`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature },
  body: rawPayload,
});
const body = await response.text();
if (response.status !== 200 || body !== "EVENT_RECEIVED") {
  console.error(`Live Meta webhook POST signature verification failed with HTTP ${response.status}.`);
  process.exit(1);
}

console.log("Live Meta webhook POST signature verification succeeded.");
