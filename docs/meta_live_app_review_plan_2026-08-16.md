# NexaReply — Meta Live რეჟიმისა და App Review-ის დეტალური გეგმა

**მომზადების თარიღი:** 2026-08-16  
**არსებული აპი:** Automated Messenger — არსებული Meta App უნდა შენარჩუნდეს; ახალი App-ის შექმნა არ არის საჭირო.  
**მიზანი:** NexaReply-ის Page-ების self-service OAuth კავშირი გახდეს ხელმისაწვდომი იმ Facebook მომხმარებლებისთვისაც, რომლებსაც Meta App-ის Administrator/Developer/Tester როლი არ აქვთ.

> **მნიშვნელოვანი განსხვავება:** Development mode-ში მიმდინარე flow-ის ტესტირება შესაძლებელია მხოლოდ App role მომხმარებლებით. Live mode-ში უცხო მომხმარებლები შეძლებენ ავტორიზაციას მხოლოდ იმ permissions/features-ის ფარგლებში, რომლებიც Meta-მ App Review/Advanced Access-ით დაამტკიცა. ამიტომ Live-ზე გადართვა არ უნდა მოხდეს მხოლოდ toggle-ის დაჭერით.

## 1. მიმდინარე მდგომარეობა

NexaReply-ის კოდის მხარე უკვე ამზადებს საჭირო server-side flow-ს: OAuth code exchange, Page selection, ერთი usable Page-ის auto-connect, მრავალ Page-ზე picker, webhook verification, `X-Hub-Signature-256` validation, idempotent inbound events, encrypted tenant-scoped Page vault და server-side Messenger send adapter.

ამჟამად დარჩენილია Meta-ის owner-side approval. Business portfolio Dashboard-ში ნაჩვენებია როგორც **Unverified**, Access Verification ჯერ ხელმისაწვდომი არ არის, ხოლო non-role Facebook ანგარიშით ადრე მიღებული იყო „Feature unavailable“. ამიტომ პროექტმა ჯერ არ უნდა განაცხადოს, რომ ნებისმიერი Facebook account მზადაა Page-ის დასაკავშირებლად.

### NexaReply-ის ზუსტი production URL-ები

| დანიშნულება | URL | სად გამოიყენება |
|---|---|---|
| OAuth redirect URI | `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/callback` | Facebook Login for Business / OAuth configuration |
| Messenger webhook callback | `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/webhook` | Messenger → Webhooks callback |
| Deauthorization callback | `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/deauthorize` | App lifecycle/deauthorization |
| Data Deletion Request URL | `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/data-deletion` | User data deletion workflow |
| Terms URL | `https://nexareply-2chxuc4s.manus.space/terms` | App settings → Basic |
| Data deletion instructions URL | `https://nexareply-2chxuc4s.manus.space/data-deletion` | App settings → Basic / User data deletion |

## 2. სწორი სტრატეგია permissions-ისთვის

NexaReply-ის პირდაპირი multi-client Page flow-ისთვის აუცილებელი ძირითადი permissions არის `pages_show_list`, `pages_manage_metadata` და `pages_messaging`. `pages_read_engagement` მიმდინარე direct flow-ში ცალკე Page engagement მონაცემებს არ კითხულობს. `business_management` გამოიყენება მხოლოდ არსებულ optional System User fallback-ში, როცა პირდაპირი `/me/accounts` პასუხი ცარიელია და Meta client-business token path-ს აბრუნებს.

| Permission | NexaReply-ის რეალური გამოყენება | Reviewer-ისთვის საჩვენებელი მოქმედება | რეკომენდაცია |
|---|---|---|---|
| `pages_show_list` | ავტორიზებული პირის Page-ების მიღება `GET /me/accounts`-ით | Facebook authorization → Page list/picker | მოითხოვე; core permission-ია |
| `pages_manage_metadata` | არჩეული Page-ის webhook subscription `POST /{page-id}/subscribed_apps` | Page selection-ის შემდეგ connected/webhook status | მოითხოვე; core permission-ია |
| `pages_messaging` | Messenger reply `POST /{page-id}/messages`-ით და Page conversation flow | test Page-დან inbound message → NexaReply Inbox → approved reply | მოითხოვე; core permission-ია |
| `pages_read_engagement` | მიმდინარე source-ში პირდაპირი `/feed`, `/insights`, `/followers` ან Page-content query არ არსებობს | ცალკე UI claim არ უნდა გაკეთდეს | შეიტანე მხოლოდ მაშინ, თუ retained fallback-ის Meta dependency მოითხოვს |
| `business_management` | მხოლოდ `/{client_business_id}/system_user_access_tokens` fallback | აჩვენე მხოლოდ fallback-ის narrowly-scoped სცენარი, არა Ads/Business asset management | დატოვე მხოლოდ fallback-ის შესანარჩუნებლად; სხვა შემთხვევაში არ მოითხოვო |

### გადაწყვეტილება, რომელიც App Review-მდე უნდა დაფიქსირდეს

არსებობს ორი უსაფრთხო გზა.

**ვარიანტი A — არსებული fallback-ის შენარჩუნება.** App Review-ში ითხოვ ყველა მიმდინარე scope-ს და screencast-ში აღწერ/აჩვენებ, რომ `business_management` გამოიყენება მხოლოდ მაშინ, როცა Meta-ის Facebook Login for Business response-ში პირდაპირი Page list ცარიელია და უკვე ავტორიზებული business integration System User token-ის read-only fallback არის საჭირო. არ უნდა თქვა, რომ NexaReply მართავს ad accounts-ს, იღებს advertising data-ს ან მომხმარებლის business token-ს ინახავს.

**ვარიანტი B — lean direct flow.** App Review-ში ითხოვ მხოლოდ სამ core permission-ს და System User fallback-ის გარეშე ატარებ გარე მომხმარებლის ტესტს. ეს უფრო მარტივად ასახსნელი scope-ია, მაგრამ სანამ არჩეული Facebook Login for Business response-ების სხვადასხვა ტიპზე პირდაპირი `/me/accounts` flow არ შემოწმდება, fallback-ის ამოღება ცალკე code change-ად არ უნდა დაიწყოს.

**რეკომენდაცია ამ ეტაპზე:** ჯერ არ ამოიღო fallback. App Review-ის აღწერაში გამოიყენე ვარიანტი A და მოამზადე დამატებითი პირდაპირი-flow evidence. თუ Meta reviewer სწორედ `business_management`-ს ან fallback-ს კითხვის ნიშნის ქვეშ დააყენებს, შემდეგ გადავიდეთ ვარიანტი B-ზე ცალკე ტესტისა და ცვლილების შემდეგ.

## 3. Phase 0 — წინასწარი ტექნიკური და ანგარიშის მზადყოფნა

Meta Dashboard-ში ცვლილებამდე owner-მა უნდა შეამოწმოს:

1. გამოყენებულია ზუსტად არსებული **Automated Messenger** App; ახალი App არ შეიქმნას.
2. App-ის Basic settings-ში შენარჩუნებულია App ID, App secret, privacy/terms/data deletion URLs და არსებული webhook configuration.
3. NexaReply managed secrets-ში არსებული credentials არ შეიცვალოს და არ დაკოპირდეს Chat-ში, source code-ში ან screenshot-ში.
4. Meta Business Portfolio-ს owner-ს აქვს **Full control**. Business Verification-ის დაწყება შეუძლია მხოლოდ portfolio full-control owner-ს.
5. ბიზნესის იურიდიული სახელი, ოფიციალური მისამართი, ტელეფონი და HTTPS website ზუსტად ემთხვევა ოფიციალურ დოკუმენტებსა და Meta Business Suite-ში შეყვანილ მონაცემებს.
6. მომზადებულია ოფიციალური დოკუმენტი, რომელზეც ჩანს legal business name და official address/phone. თუ დოკუმენტი Meta-ს მხარდაჭერილ ენაზე არ არის, წინასწარ მოამზადე ოფიციალურად დამოწმებული ინგლისური თარგმანი.
7. არჩეულია ერთი ცალკე **test Page**, რომელიც არ შეიცავს ნამდვილ customer conversations-ს. Reviewer-ისთვის გამოიყენე მხოლოდ test Page და test Facebook account.

Business Verification-ისთვის Meta-ის ოფიციალური Help Center მიუთითებს Security Center → Start verification გზას; საჭიროა legal business details-ის ზუსტი დამთხვევა, HTTPS website და საჭიროების შემთხვევაში ოფიციალური business registration/license ან incorporation დოკუმენტი. დოკუმენტები არ უნდა შეიცავდეს ზედმეტ პირად ინფორმაციას.[3] [4]

## 4. Phase 1 — Business Verification

1. შედი Meta Business Suite-ში იმ ანგარიშით, რომელსაც Business Portfolio-ზე Full control აქვს.
2. გახსენი [Security Center](https://business.facebook.com/settings/security) და აირჩიე **Start verification**.
3. შეავსე legal business name, address, phone და website ზუსტად ოფიციალური ჩანაწერების შესაბამისად.
4. თუ Meta ავტომატურად ვერ პოულობს ბიზნესს, აირჩიე შესაბამისი „My business isn’t listed/None of these match“ გზა და ატვირთე ოფიციალური დოკუმენტი.
5. დაადასტურე კავშირი Meta-ს მიერ შემოთავაზებული email/phone/SMS/WhatsApp ან domain verification მეთოდით.
6. შეინახე submission reference/status screenshot-ში ისე, რომ არ ჩანდეს პირადი დოკუმენტის ზედმეტი მონაცემები.
7. დაელოდე გადაწყვეტილებას. Meta-ის Help Center-ში მითითებულია, რომ გადაწყვეტილებას შეიძლება დასჭირდეს **14 სამუშაო დღემდე**; თუ ბიზნესის დეტალებს შეცვლი, verification შეიძლება თავიდან გახდეს საჭირო.[4]

**თუ სტატუსი არის Ineligible:** ნუ ეცდები verification-ის გვერდის ავლას. შეამოწმე Meta-ს notification/Access Verification მოთხოვნა და დაეყრდენი სწორედ Dashboard-ში ნაჩვენებ მოთხოვნას.

## 5. Phase 2 — Access Verification და App Review-ის ჩართვა

Business Verification-ის დასრულების შემდეგ:

1. გახსენი Automated Messenger App → **App Review → Permissions and Features**.
2. გადაამოწმე თითოეული permission-ის access level და dashboard-ის მოთხოვნები.
3. თუ Access Verification ახლა გახდა ხელმისაწვდომი, შეავსე მხოლოდ ის ბიზნეს/დეველოპერული ინფორმაცია, რასაც Dashboard ითხოვს.
4. Facebook Login for Business configuration-ში შექმენი production configuration, თუ ამ architecture-ს იყენებ, და ჩაწერე ზუსტი redirect URI. NexaReply-ის მიმდინარე `META_LOGIN_CONFIG_ID` ცარიელია; მისი შევსება მხოლოდ owner-ის Meta configuration-ის შექმნისა და სწორად შემოწმების შემდეგ უნდა მოხდეს.
5. არ მოითხოვო `pages_read_engagement` ან `business_management` ფართო აღწერით. თითოეული scope უნდა იყოს მიბმული კონკრეტულ endpoint-სა და reviewer-ის მიერ გასამეორებელ მოქმედებაზე.

Meta-ის ოფიციალური App Review დოკუმენტის მიხედვით, თუ აპი გამოიყენება იმ პირების მიერ, რომლებსაც App-ზე ან claimed Business-ზე role არ აქვთ, App Review საჭიროა; reviewer რეალურად შეამოწმებს, შეუძლია თუ არა აპში იმ ფუნქციის გამოყენება, რომლის permission-საც ითხოვ. თუ reviewer ვერ შედის ან ვერ იმეორებს კონკრეტულ permission flow-ს, permission-ის approval შეიძლება უარყონ.[1]

## 6. Phase 3 — Reviewer account და test assets

მოამზადე reviewer-friendly, მაგრამ უსაფრთხო გარემო:

| Asset | რა უნდა იყოს მზად |
|---|---|
| Test Facebook account | App role account; საჭიროების შემთხვევაში Meta review account-ის ინსტრუქციით. მას უნდა ჰქონდეს test Page-ზე Facebook access with Full control. |
| Test Page | მხოლოდ review-სთვის შექმნილი ან გამოყოფილი Page; არ გამოიყენო რეალური მომხმარებლების საუბრები. |
| NexaReply login | ცალკე test workspace/account, რომელშიც reviewer-ს შეუძლია შესვლა. არ გადასცე production owner password. |
| Test conversation | წინასწარ დაგეგმილი message: პროდუქტის ფასი/მარაგი → AI draft → operator-approved reply → ticket/handoff. |
| Screen recording | 1–3 წუთიანი უწყვეტი recording, თითო permission-ის რეალური გამოყენებით. Token, secret, personal ID და raw webhook payload არ ჩანდეს. |
| Written steps | ზუსტი URL, login steps, გვერდის არჩევა, expected result, reset/recovery ნაბიჯები. |

### Screencast-ის რეკომენდებული სცენარი

1. გახსენი NexaReply test workspace და შედი **ინტეგრაციები → Meta Messenger**.
2. დააჭირე **Facebook-ით ავტორიზაციას**.
3. Meta consent screen-ზე აჩვენე მოთხოვნილი permissions; არ გააკეთო ზედმეტი click-ები ან პირადი ანგარიშის მონაცემების ჩვენება.
4. აირჩიე test Page. თუ ერთი usable Page დაბრუნდა, აჩვენე auto-connect; თუ რამდენიმე დაბრუნდა, აჩვენე Page picker.
5. NexaReply-ში აჩვენე მხოლოდ Page name, connection status და webhook status. არ აჩვენო Page token, authorization code, App secret, verify token, ciphertext ან raw provider payload.
6. Test Page-დან გაგზავნე Messenger message. აჩვენე inbound message Inbox-ში, AI draft/evidence და operator approval.
7. გააგზავნე პასუხი. აჩვენე delivery status და, საჭიროების შემთხვევაში, human takeover/ticket.
8. საჭირო হলে აჩვენე disconnect/recovery state. არ წაშალო tenant ან რეალური data review-ის დროს.

## 7. Permission-by-permission reviewer text

ეს ტექსტები უნდა გამოიყენო App Review-ის description ველებში მოკლე, კონკრეტული ფორმით.

**`pages_show_list`:** „NexaReply lets a workspace owner connect a Facebook Page to its tenant. After Facebook authorization, the server calls `/me/accounts` to list only Pages returned for that authorizing person. The UI displays safe Page name/ID metadata so the owner can select the correct Page. Page access tokens remain server-side and are never returned to the browser.“

**`pages_manage_metadata`:** „After the owner selects a Page, NexaReply subscribes that Page to the Messenger webhook fields through `/{page-id}/subscribed_apps`. This is required to receive inbound messages, delivery events and postback events for the connected Page. The subscription is completed server-side before the tenant connection is marked connected.“

**`pages_messaging`:** „NexaReply is a customer-support workspace for Page Messenger. It stores inbound customer conversations, generates an AI draft grounded in the tenant catalog/knowledge base, requires operator controls, and sends an approved text reply through `/{page-id}/messages` using the encrypted server-side Page credential.“

**`pages_read_engagement`:** „The current NexaReply direct Page flow does not read Page posts, insights, followers or other engagement content. This permission is retained only if Meta requires it as an indirect dependency of the optional Facebook Login for Business System User fallback. No separate engagement feature is claimed.“

**`business_management`:** „NexaReply does not manage ads or advertising assets. This permission is used only by a narrow fallback for Facebook Login for Business: when the direct Page list is empty and Meta returns a client-business context, the server may use the already-authorized business integration System User token path to retry Page discovery. The fallback token is temporary, not shown to the browser, and not persisted as a customer credential.“

## 8. App Review submission checklist

Before pressing Submit, verify every item below:

- Terms URL and Data Deletion URL open publicly in an incognito browser.
- Privacy policy URL is accessible and describes Meta data handling without exposing secrets.
- Deauthorization and Data Deletion callback URLs are configured exactly as above.
- OAuth redirect URI matches character-for-character in NexaReply and Meta Dashboard.
- Webhook callback and verify token are already validated in Meta Dashboard.
- Test account can log in to NexaReply and has Full control on the test Page.
- Reviewer steps include the exact button labels and the expected result after every action.
- Screencast demonstrates the actual permission use, not just the Home page or a static mock.
- No App Secret, Page token, Verify token, authorization code, raw webhook payload, customer conversation, or identity document appears in the submission.
- The requested permission list matches the current code. Remove any permission that is not used or cannot be demonstrated.
- If `META_LOGIN_CONFIG_ID` is configured, test both fresh and returning Facebook Login for Business behavior.
- If the submission retains the System User fallback, explain it narrowly and do not describe it as advertising or Business Manager control.

## 9. Phase 4 — Submit, handle questions, and switch to Live

Submit App Review only after the test path works repeatedly in Development mode with the dedicated test account and test Page. After submission, monitor Meta Dashboard notifications and answer reviewer questions with a short reproduction path, not a general marketing explanation.

**Do not switch to Live before the required permissions/features are approved.** Meta's App Modes documentation states that Development mode is limited to role users, while Live mode permits broader users only for approved permissions/features; it also recommends switching only after development and App Review are complete.[2]

When Dashboard shows the required permissions/features approved and no blocking verification item remains:

1. Confirm the production OAuth configuration and redirect URI.
2. Confirm webhook subscription and callback verification.
3. Confirm public legal URLs and data deletion flow.
4. Capture the current Development-mode checkpoint/status for rollback evidence.
5. App administrator switches the App Dashboard toolbar from Development to Live.
6. Immediately perform the post-Live external test described below.

## 10. Post-Live external validation

Use a Facebook account that is **not** App Admin, Developer, Tester or otherwise a role user. The account must have Facebook access with Full control to its own test Page.

| Test | Expected result |
|---|---|
| New NexaReply registration/login | User can create or access its own workspace; another organization’s data is not visible. |
| Start Meta OAuth | Meta consent completes without “Feature unavailable” or development-mode role restriction. |
| One Page returned | NexaReply auto-connects after server identity, token usability and webhook checks. |
| Multiple Pages returned | User sees only its own returned Pages and can select one. |
| Browser inspection | No Page token, App secret, verify token, authorization code or raw provider payload appears in HTML, JS, tRPC response or browser storage. |
| Messenger inbound | Test Page message appears once in the correct organization Inbox. Repeated webhook delivery does not duplicate it. |
| Operator reply | Approved reply is delivered through the selected Page; failure state is visible if Meta rejects delivery. |
| Disconnect/reconnect | Failed unsubscribe does not silently destroy the encrypted vault; recovery state is visible. |
| Data deletion/deauthorization | Signed callbacks return the expected confirmation handoff and use the verified owner/organization workflow. |

Run this test with at least one fresh account and, if possible, a second account that owns a different Page. This proves that the system is not accidentally bound to the Amadeo Page or the original App role account.

## 11. Failure handling

| Failure | Safe response |
|---|---|
| Business Verification rejected | Do not alter App credentials or create a replacement App. Check exact legal-name/address mismatch and Meta's rejection reason; resubmit with corrected official evidence. |
| Access Verification unavailable | Confirm Business Verification and required portfolio full control first; do not submit random permissions. |
| Reviewer cannot log in | Provide a fresh test account/instructions and verify the test Page Full control before replying. |
| Permission rejected | Narrow the permission request to actual code usage, improve the screencast, and resubmit only the denied permission evidence. |
| External account sees “Feature unavailable” | Keep App in Development mode for testing; do not claim public readiness. Check approval status and Live mode only after review completion. |
| OAuth callback fails | Check redirect URI character-for-character and server logs; do not ask the user to paste tokens into chat. |
| Page subscription fails | Check Page Full control, approved `pages_manage_metadata`, token/Page ID pairing and webhook settings. Preserve existing Amadeo connection while diagnosing. |
| Messenger send fails | Inspect server-side delivery error, Page status and Meta policy window; never expose the Page credential to the browser. |

## 12. Owner action order — მოკლე ვერსია

1. მოამზადე legal business details, official documents, HTTPS website და test Page.
2. დაასრულე Business Verification Security Center-ში.
3. გადაამოწმე Access Verification-ის ხელმისაწვდომობა და მოთხოვნები.
4. შექმენი/დაადასტურე Facebook Login for Business production configuration; მხოლოდ შემოწმების შემდეგ შეავსე `META_LOGIN_CONFIG_ID`.
5. App Review-ში შეიტანე საჭირო permissions და ზემოთ მოცემული narrow justifications.
6. ატვირთე reviewer screencast და reproducible test steps.
7. დაელოდე approval-ს; reviewer კითხვებზე უპასუხე იმავე test account/Page-ით.
8. approval-ის შემდეგ გადართე App Live mode-ში.
9. იმავე დღეს გაუშვი non-role external OAuth, Page selection, webhook, inbound, outbound, dedupe და data deletion smoke tests.
10. მხოლოდ წარმატებული retest-ის შემდეგ ჩათვალე self-service public onboarding აქტიურად დადასტურებულად.

## References

[1] [Meta App Review](https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review) — role users, App Review requirement and reviewer testing expectations.  
[2] [Meta App Modes](https://developers.facebook.com/documentation/development/build-and-test/app-modes) — Development/Live access rules and mode-switching guidance.  
[3] [Meta Business Help: Official verification documents](https://www.facebook.com/business/help/159334372093366) — accepted business evidence and document requirements.  
[4] [Meta Business Help: How to verify your business](https://www.facebook.com/business/help/2058515294227817) — Security Center flow, full control, details, confirmation and timing.  
[5] [NexaReply Meta Public OAuth Rollout](./meta_public_oauth_rollout.md) — current owner-side status and exact rollout blockers.  
[6] [NexaReply Permission Audit](./meta_permission_audit_2026-08-15.md) — endpoint-level permission mapping.  
[7] [NexaReply Meta App Review Scope](../META_APP_REVIEW.md) — reviewer evidence and secret-boundary rules.
