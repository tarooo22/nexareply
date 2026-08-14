const token = process.env.META_PAGE_ACCESS_TOKEN;
const targetId = process.env.META_PAGE_TARGET_ID || "me";
const edge = process.env.META_PAGE_TARGET_EDGE?.replace(/^\/+/, "") || "";
if (!token) {
  console.error("META_PAGE_ACCESS_TOKEN is unavailable to this diagnostic process.");
  process.exit(2);
}

const url = new URL(`https://graph.facebook.com/v24.0/${encodeURIComponent(targetId)}${edge ? `/${edge}` : ""}`);
url.search = new URLSearchParams({ fields: "id", access_token: token }).toString();
const response = await fetch(url);
const payload = await response.json().catch(() => null);
const error = payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object" ? payload.error : null;
const code = error && "code" in error && typeof error.code === "number" ? error.code : null;
const type = error && "type" in error && typeof error.type === "string" ? error.type : null;
const subcode = error && "error_subcode" in error && typeof error.error_subcode === "number" ? error.error_subcode : null;
const message = error && "message" in error && typeof error.message === "string" ? error.message.replaceAll(token, "[redacted]").replace(/EA[A-Za-z0-9_-]{20,}/g, "[redacted]").slice(0, 300) : null;

console.log(JSON.stringify({ ok: response.ok, status: response.status, hasId: Boolean(payload && typeof payload === "object" && "id" in payload && typeof payload.id === "string"), errorCode: code, errorSubcode: subcode, errorType: type, errorMessage: message }));
process.exit(response.ok ? 0 : 1);
