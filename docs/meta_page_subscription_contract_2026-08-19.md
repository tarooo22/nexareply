# Meta Page Webhook Subscription Contract

## Finding

The `POST /{page-id}/subscribed_apps` edge expects the required `subscribed_fields` parameter as standard POST form data. Meta's official Page Subscribed Apps reference illustrates this with `-F subscribed_fields=...`; the Page Webhooks guide also shows the parameter in the request form rather than a JSON object.[1][2]

NexaReply previously sent this field in a JSON request body. Although Page identity validation succeeded, the subscription request could fail in Meta's endpoint validation. The server now sends `application/x-www-form-urlencoded` data for Page subscription requests.

## Security boundary

The Page Access Token and App Secret remain server-only. Both OAuth page selection and owner-only manual connection requests attach an `appsecret_proof` derived on the server. No proof, Page Access Token, App Secret, or raw provider diagnostic is returned to the browser or written to workspace audit data.

## Current page-level fields

NexaReply requests `messages`, `message_deliveries`, `message_echoes`, and `messaging_postbacks`. Meta requires the app-level Webhooks subscription and the Page-level subscription to overlap for notifications to be delivered.[1]

## References

[1] [Meta Graph API Reference — Page Subscribed Apps](https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/)

[2] [Meta — Webhooks for Pages](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-pages/)
