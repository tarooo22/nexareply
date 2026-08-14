const pageId = process.env.META_PAGE_ID;
const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
const appId = process.env.META_APP_ID;

if (!pageId || !pageToken || !appId) {
  console.error("Meta Page subscription probe requires META_PAGE_ID, META_PAGE_ACCESS_TOKEN, and META_APP_ID.");
  process.exit(2);
}

const url = new URL(`https://graph.facebook.com/v24.0/${encodeURIComponent(pageId)}/subscribed_apps`);
url.search = new URLSearchParams({ fields: "id,subscribed_fields", access_token: pageToken }).toString();
const response = await fetch(url);
const payload = await response.json().catch(() => null);
if (!response.ok || !payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
  console.error(`Meta Page subscription read failed with HTTP ${response.status}.`);
  process.exit(1);
}

const currentApp = payload.data.find((item) => item && typeof item === "object" && item.id === appId);
const subscribedFields = Array.isArray(currentApp?.subscribed_fields) ? currentApp.subscribed_fields : [];
const required = ["messages", "message_deliveries", "message_echoes", "messaging_postbacks"];
console.log(JSON.stringify({ currentAppInstalled: Boolean(currentApp), requiredFieldCoverage: required.every((field) => subscribedFields.includes(field)) }));
