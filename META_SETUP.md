# Meta Messenger setup for NexaReply

NexaReply-ის Meta Messenger adapter **default-ად გამორთულია**. სანამ ყველა server-side managed setting არ არის შევსებული, workspace აჩვენებს მხოლოდ `არ არის კონფიგურირებული` მდგომარეობას და არ დაიწყებს OAuth-ს, არ მიიღებს webhook-ს და არ გაგზავნის Messenger შეტყობინებას.

> არცერთი Meta credential არ უნდა მოხვდეს repository-ში, database-ში, `.env` ფაილში, browser bundle-ში, tRPC პასუხში ან support ticket-ის ტექსტში. გამოიყენეთ მხოლოდ პროექტის managed secrets.

## 1. მოამზადეთ Meta App

შედით [Meta for Developers](https://developers.facebook.com/apps/) პორტალში და შექმენით Business app. დაამატეთ **Facebook Login**, **Messenger** და **Webhooks** პროდუქტები. რეალური მომხმარებლებისგან inbound შეტყობინებების მისაღებად Meta მოითხოვს შესაბამის access-სა და, საჭიროებისამებრ, App Review-ს; test რეჟიმში გამოიყენეთ app role-ის მქონე მომხმარებლები. [1]

NexaReply-ის მიმდინარე production endpoint-ებია:

| დანიშნულება | ზუსტი URL |
|---|---|
| Facebook Login redirect URI | `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/callback` |
| Messenger webhook callback URL | `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/webhook` |

Facebook Login for Business-ის production configuration-ისთვის გამოიყენეთ `META_LOGIN_CONFIG_ID` თუ owner შექმნის Configuration-ს. ამ მნიშვნელობის გარეშე NexaReply ინარჩუნებს მხოლოდ App Admin/Developer/Tester-სთვის განკუთვნილ generic OAuth fallback-ს. მიმდინარე request-ში `META_LOGIN_CONFIG_ID` ცარიელია. Generic fallback-ის scope-ებია `business_management`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` და `pages_messaging`; production external-account access არ არის გამოცხადებული.

## 2. დაამატეთ managed secrets

Project settings-ის **Secrets** განყოფილებაში დაამატეთ ქვემოთ მოცემული keys. მნიშვნელობები შეიყვანეთ მხოლოდ protected UI-ში; source code-ში არასოდეს ჩაწეროთ.

| Managed key | საიდან მიიღება | დანიშნულება |
|---|---|---|
| `META_APP_ID` | **App settings → Basic** | Server-side OAuth authorization URL. |
| `META_APP_SECRET` | **App settings → Basic** | OAuth code exchange, appsecret proof და webhook HMAC verification. |
| `META_VERIFY_TOKEN` | თავად შექმენით შემთხვევითი, გრძელი მნიშვნელობა | Meta webhook GET challenge-ის დასამთხვევად. |
| `META_PAGE_ACCESS_TOKEN` | Meta Graph API Explorer ან Messenger settings-იდან, Page-ის შესაბამისი უფლებებით | Page webhook subscription და server-side `/{page-id}/messages` delivery. არასოდეს ინახება database-ში. |
| `META_OAUTH_REDIRECT_URI` | ამ დოკუმენტის callback URL | OAuth callback; ზუსტად უნდა ემთხვეოდეს Meta Dashboard-ში ჩაწერილ მნიშვნელობას. |
| `META_GRAPH_API_VERSION` | არჩევითი | Graph API version override; თუ არ არის მითითებული, adapter იყენებს `v24.0`-ს. |

`META_VERIFY_TOKEN` არ არის Meta-ის მიერ გენერირებული password — ეს არის თქვენი საკუთარი secret string, რომელსაც ერთნაირად უთითებთ managed secret-ში და Meta Webhooks settings-ის **Verify Token** ველში. Meta შემდეგ აგზავნის `hub.verify_token` და NexaReply პასუხობს მხოლოდ შესაბამის `hub.challenge`-ს. [1]

## 3. დააკონფიგურირეთ webhook

Meta App Dashboard-ში გადადით **Messenger → Settings**-ზე, დაამატეთ webhook callback URL და იგივე verify token. აირჩიეთ მინიმუმ `messages`; NexaReply დამატებით ითხოვს `message_deliveries`, `message_echoes` და `messaging_postbacks`, რათა delivery და echo მოვლენები უსაფრთხოდ დააიგნოროს ან დააფიქსიროს. Meta webhook event notification-ს `200 OK` პასუხი სჭირდება მოკლე ვადაში და შეიძლება retry გააკეთოს, ამიტომ NexaReply ინახავს provider event key-ს unique constraint-ით, სანამ conversation-ს შეცვლის. [1]

POST webhook-ისთვის NexaReply ადარებს raw request body-დან გამოთვლილ `HMAC-SHA256` მნიშვნელობას `X-Hub-Signature-256` header-ს constant-time შედარებით. არასწორი ან დაკარგული ხელმოწერა აბრუნებს `401` და payload არ მუშავდება. Meta რეკომენდაციას აძლევს სწორედ App Secret-ით SHA-256 payload signature-ის გადამოწმებას. [1]

## 4. დააკავშირეთ Page NexaReply-ში

OAuth-ის შემდეგ NexaReply server-side იღებს Page candidates-ს. თუ ზუსტად ერთი usable Page დაბრუნდა, server ამოწმებს Page identity-ს, token usability-ს და `/{page-id}/subscribed_apps` webhook subscription-ს და შემდეგ ავტომატურად აკავშირებს მას. მხოლოდ რამდენიმე usable Page-ის შემთხვევაში აჩვენებს owner-ს მოკლე Page picker-ს.

`meta_connections` ინახავს მხოლოდ Page ID/name/status metadata-ს, ხოლო Page credential ინახება მხოლოდ tenant-scoped encrypted vault-ში. Page token, App Secret, Verify Token და callback configuration browser-ში ან tRPC response-ში არ ბრუნდება.

თუ Meta აბრუნებს `Requires pages_manage_metadata permission to manage the object`, subscriptions-ის checkbox-ები საკმარისი არ არის. დაადასტურეთ, რომ token-ის გენერაციის Facebook ანგარიშს არჩეულ Page-ზე აქვს **Full control**, რომ `pages_manage_metadata` მზადაა გამოყენებისთვის **App Review → Permissions and Features**-ში, და შემდეგ ზუსტად იმავე Page-ის რიგიდან თავიდან შექმენით Page token. Page ID და token ყოველთვის ერთი Page-ის რიგიდან უნდა მოდიოდეს.

თუ Messenger setup-ის **Generate** ღილაკი კვლავ ქმნის token-ს საჭირო scope-ის გარეშე, გამოიყენეთ Meta-ის **Graph API Explorer** fallback: აირჩიეთ თქვენი App, **Get Token → Get User Access Token**-ში მონიშნეთ `pages_manage_metadata`, `pages_show_list` და `pages_messaging`, შემდეგ ხელახლა **Get Token**-დან აირჩიეთ ზუსტად ის Page, რომლის ID-საც იყენებთ. მხოლოდ ამის შემდეგ შეინახეთ Page token managed `META_PAGE_ACCESS_TOKEN` secret-ში. Meta-ის API Integration Helper სასარგებლოა token-ის Messenger send permission-ის შესამოწმებლად, მაგრამ webhook subscription scope-ს თავად არ ამატებს. [1]

## Owner-ის OAuth და Page არჩევის გზა

Owner workspace-ში **ინტეგრაციები → Meta-თან დაკავშირება** სრულ-გვერდიან Meta authorization redirect-ს იწყებს. NexaReply ინახავს მხოლოდ მოკლეხნიან, owner-scoped opaque session reference-ს და არა Meta provider token-ს. Meta authorization-ის შემდეგ callback ავტომატურად აბრუნებს მომხმარებელს `/app`-ში; ხელმისაწვდომი Page-ები ავტომატურად იტვირთება და owner ირჩევს სასურველ Page-ს. წარმატებისას UI აჩვენებს connected მდგომარეობას; cancel, provider error ან expired session არ ცვლის უკვე დაკავშირებულ Page-ს და აჩვენებს recovery მოქმედებას. Popup-ის დახურვა და ხელით „Page-ების სიის განახლება“ აღარ არის საჭირო.

### Development-mode-ში დადასტურებული რეალური გზა

2026-08-14-ზე Development mode-ში წარმატებით დადასტურდა შემდეგი გზა: owner custom email/password session-ით შედის NexaReply-ში, იწყებს **Meta-თან დაკავშირება** flow-ს, Facebook Login for Business-ში ირჩევს Page-ს და ადასტურებს მოთხოვნილ permissions-ს, შემდეგ callback აბრუნებს მომხმარებელს NexaReply-ში. არჩეული Page persistence-ში ინახება მხოლოდ `pageId`, `pageName` და connection status-ით; OAuth/User/System User provider tokens არც database-ში ინახება და არც UI/tRPC პასუხში ჩნდება.

Facebook Login for Business შეიძლება დააბრუნოს ან ჩვეულებრივი user token, ან client-business-ზე მიბმული System User token. პირველ შემთხვევაში NexaReply კითხულობს `/me/accounts`-ს. თუ ეს სია ცარიელია, server მოკლეხნიანად კითხულობს client-business-ის read-only token path-ს და ხელახლა იღებს მხოლოდ ავტორიზებული Page-ის ID/name metadata-ს. ეს temporary token request დასრულებისთანავე აღარ ინახება; Page subscription მაინც ცალკე server-side managed `META_PAGE_ACCESS_TOKEN`-ით მოწმდება. [4]

რეალურ ტესტში აუცილებელი იყო, რომ ერთი და იგივე Facebook პროფილი: (a) იყოს Meta App-ის Administrator/Developer/Tester, რადგან App Development mode-შია, და (b) არჩეულ Page-ზე ჰქონდეს **Facebook access with Full control**. მხოლოდ task/partial access საკმარისი არ არის Page-ის authorized asset-ად დასაბრუნებლად.

| Workspace მდგომარეობა | მნიშვნელობა | Owner-ის შემდეგი ნაბიჯი |
|---|---|---|
| **არ არის კონფიგურირებული** | რომელიმე აუცილებელი managed setting არ არის შევსებული. | დაამატეთ ყველა key და განაახლეთ გვერდი. |
| **დადასტურება ვერ შესრულდა** | Page subscription ან Meta permission ვერ დადასტურდა. | გადაამოწმეთ Page role, permissions და callback/verify token. |
| **დაკავშირებულია** | Page subscription დასრულდა; webhook inbound event-ები ინახება idempotent event log-ში. | გააგზავნეთ test message Page-ზე და შეამოწმეთ Inbox. Meta Dashboard-ის callback validation ცალკე სრულდება webhook GET challenge-ით. |
| **გაგზავნა ვერ შესრულდა** | Meta-მა server-side delivery request უარყო ან დააბრუნა შეცდომა. | შეამოწმეთ Page access, policy და 24-საათიანი response window. [2] |

## 5. რა ხდება inbound და outbound შეტყობინებისას

Inbound `messages` event პირველ რიგში ინახება `meta_webhook_events`-ში organization-and-event unique key-ით. მხოლოდ ახალი event ქმნის ან პოულობს ორგანიზაციაში Page-scoped customer conversation-ს, ამატებს `messages` ჩანაწერს `source = meta`-ით და აახლებს `background_jobs`-ში per-conversation processing job-ს. განმეორებითი Meta delivery ვერ შექმნის მეორე message-ს ან მეორე job-ს.

Outbound ტექსტი იგზავნება მხოლოდ server-side Page token-ით `/{page-id}/messages` Graph API endpoint-ზე. Meta-ის `RESPONSE` ტიპის შეტყობინება მომხმარებლის ბოლო შეტყობინებიდან 24 საათში უნდა გაიგზავნოს; სხვა შემთხვევებზე საჭიროა Meta-ის შესაბამისი policy/template flow. [2]

## 6. Durable worker requirement — მნიშვნელოვანი შეზღუდვა

`background_jobs` უკვე არის persistent source of truth. თუმცა მიმდინარე autoscaling runtime **არ იძლევა production გარანტიას**, რომ 10-წამიანი debounce worker ზუსტად და ყოველთვის გაეშვება. Meta connection-ის დამატება ამ შეზღუდვას არ ცვლის.

Production guarantee-ისთვის საჭიროა ცალკე, შემდეგი hosting configuration:

1. მუდმივად ხელმისაწვდომი worker ან queue consumer, რომელიც claims `pending process_conversation` job-ებს database-იდან.
2. Polling/scheduler ან queue wake-up მექანიზმი, რომელიც survives instance spin-down-ს და არ ეყრდნობა `setInterval`-ს ან request-ის lifecycle-ს.
3. Atomic lease/claim, retry და dead-letter/error observation policy, რათა პარალელურმა worker-ებმა ერთი job ორჯერ არ დაამუშაონ.
4. Production telemetry, alerting და რეალური load/retry verification Meta webhook-ისა და worker-ისთვის.

ამ წინაპირობების დაკონფიგურირებამდე NexaReply მხოლოდ ზუსტად ინახავს მიზნობრივ debounce timestamp-ს; იგი **არ აცხადებს production-ready 10-second execution-ს**.

## References

[1] [Meta Webhooks for Messenger Platform](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks)

[2] [Meta Messenger Platform: Send a Message](https://developers.facebook.com/documentation/business-messaging/messenger-platform/get-started)

[3] [Meta Facebook Login Security: redirect URI matching](https://developers.facebook.com/documentation/facebook-login/security)

[4] [Meta Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business)

## 4A. Current one-click onboarding contract

`META_LOGIN_CONFIG_ID` არის არჩევითი server-only key. თუ ის ცარიელია, authorization URL იყენებს არსებულ generic OAuth fallback-ს, რომელიც მხოლოდ Meta App Admin/Developer/Tester testing-ისთვის არის განკუთვნილი. Configuration ID არ უნდა გამოიგონოთ ან hardcode-ოთ.

`ENABLE_META_MANUAL_SETUP`-ის default არის `false`. ამ მდგომარეობაში ჩვეულებრივ მომხმარებელს არც Page ID-ისა და არც Page Access Token-ის ველები არ უჩანს; server-იც უარყოფს manual mutation-ს. Manual flow შეიძლება დროებით ჩაირთოს მხოლოდ owner-controlled developer/support diagnostics-ისთვის managed environment setting-ით.

Callback-ის შემდეგ connection წარმატებულად ითვლება მხოლოდ მაშინ, როცა Page identity server-side დადასტურდა, staged Page token usable აღმოჩნდა, `subscribed_apps` request წარმატებით დასრულდა და encrypted tenant vault persistence დასრულდა. ერთი usable Page ავტომატურად უკავშირდება; რამდენიმე Page-ის შემთხვევაში owner ირჩევს კონკრეტულს; zero usable Pages, cancelled/denied authorization, expired session, subscription failure და revoked credential ცალკე recovery მდგომარეობებად რჩება.

მიმდინარე უსაფრთხოდ სატესტო scope არის App Admin/Developer/Tester account, რომელსაც Page-ზე აქვს Facebook access with Full control. Meta Business Verification, Advanced Access/App Review, Live/Public mode და non-role external-account retest owner-side prerequisites-ად რჩება.

## 7. Meta lifecycle callback URLs

Meta Dashboard-ის **Deauthorize callback URL** ველში გამოიყენეთ:

`https://nexareply-2chxuc4s.manus.space/api/integrations/meta/deauthorize`

**Data Deletion Request URL** ველში გამოიყენეთ:

`https://nexareply-2chxuc4s.manus.space/api/integrations/meta/data-deletion`

ორივე endpoint იღებს Meta-ს `signed_request` form field-ს და ამოწმებს App Secret-ით HMAC-SHA256 signature-ს. არასწორი signature უარყოფილია. Data deletion callback აბრუნებს Meta-სთვის საჭირო `url`-სა და `confirmation_code`-ს; ეს callback ვერ ახდენს ავტომატურ tenant deletion-ს, რადგან Meta provider user ID-სა და NexaReply organization-ს შორის verified mapping მიმდინარე schema-ში არ ინახება. საბოლოო წაშლა იწყება authenticated owner workflow-ით `/data-deletion` policy page-დან.
