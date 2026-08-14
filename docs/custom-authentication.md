# NexaReply custom authentication

NexaReply uses its own email/password authentication for product access. Meta OAuth remains separate and is used only when an authenticated organization owner connects a Facebook Page.

| Area | Behavior |
|---|---|
| Registration | A user provides a name, email and password of at least 10 characters. The email is normalized for uniqueness and the password is salted and scrypt-hashed on the server. |
| Login | The server compares the supplied password against the stored hash using a timing-safe comparison. Login failures use a generic credential error. |
| Session | Successful register/login writes a seven-day signed httpOnly cookie. In TLS environments it is `Secure` with `SameSite=None`; plain HTTP development uses `SameSite=Lax` so the browser can retain the development cookie. The token contains a user ID and no password, provider token or password hash. |
| Authorization | Every protected procedure resolves the persisted user from the signed cookie, then applies the existing organization membership and owner/operator enforcement. |
| Public identity API | `auth.me`, registration and login return only `{ id, name, email, role }`. They never serialize `passwordHash`, `normalizedEmail`, `openId` or session data. |
| Logout | Logout clears the same session cookie using its matching security attributes. |
| Legacy records | Existing user rows are retained. Their email cannot be re-registered silently, and they require an administrator-guided credential migration before they can use password login. |

## Operations

No new secret is required for password authentication: the existing managed `JWT_SECRET` signs session tokens. Keep it server-side, rotate it if session compromise is suspected, and do not commit it to source control. `META_APP_SECRET`, Page access tokens and all other provider credentials remain independent server-only managed secrets.

The current release intentionally does not include password reset email delivery or email verification. Before opening general public registration, add a verified outbound email provider, reset-token lifecycle, rate limiting and monitoring. The current registration form is suitable for invited or controlled onboarding while those controls are added.

## Verification coverage

The automated suite covers password hashing, registration, duplicate-email rejection, valid and invalid login, session creation and validation, malformed/legacy-session rejection, logout clearing, and public identity projection. It also resolves a signed `app_session_id` through the actual tRPC context before proving protected workspace access, owner/operator denial, membership management, invitation acceptance/management, and Meta Page selection. A lightweight HTTP smoke test additionally verified registration, an httpOnly session cookie, authenticated workspace access, and logout behavior; the temporary QA account was removed immediately afterward.
