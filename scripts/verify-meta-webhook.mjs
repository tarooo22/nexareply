const token = process.env.META_VERIFY_TOKEN;
const baseUrl = process.env.META_WEBHOOK_CHECK_URL || "https://nexareply-2chxuc4s.manus.space/api/integrations/meta/webhook";

if (!token) {
  console.error("META_VERIFY_TOKEN is unavailable to this verification process.");
  process.exit(2);
}

const challenge = "nexareply-managed-secret-check";
const url = new URL(baseUrl);
url.search = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": challenge }).toString();

const response = await fetch(url);
const body = await response.text();
if (response.status !== 200 || body !== challenge) {
  console.error(`Live Meta webhook verification failed with HTTP ${response.status}.`);
  process.exit(1);
}

console.log("Live Meta webhook GET verification succeeded.");
