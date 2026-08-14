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

Facebook Login-ის **Valid OAuth Redirect URIs** ველში დაამატეთ ზემოთ მოცემული callback URL. OAuth flow ითხოვს Page list-ისა და Messenger-ისთვის საჭირო უფლებებს: `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` და `pages_messaging`. Page selection ეკრანზე გამოჩნდება მხოლოდ Page-ები, რომლებზეც ავტორიზებულ ანგარიშს აქვს Messenger-თან თავსებადი ამოცანა. Meta-ის message API-ს Page access token და `pages_messaging` უფლება სჭირდება. [2]

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

OAuth-ით შედით NexaReply protected workspace-ში როგორც **owner**, გახსენით **ინტეგრაციები → Meta Messenger** და დააჭირეთ **Meta-თან დაკავშირება**. Meta authorization დასრულების შემდეგ დაბრუნდით workspace-ში, დააჭირეთ **Page-ების სიის განახლება** და აირჩიეთ სასურველი Page. OAuth session ინახავს მხოლოდ დასაშვებ Page ID/name metadata-ს და არა Meta access token-ს.

NexaReply ავტომატურად ცდილობს არჩეული Page-ის subscription-ს `subscribed_apps` edge-ზე, მაგრამ ამ მოქმედებისთვის იყენებს მხოლოდ managed `META_PAGE_ACCESS_TOKEN`-ს. ამ token-ს `pages_messaging`/`pages_manage_metadata` უფლებები სჭირდება. [1] `meta_connections` ინახავს მხოლოდ Page-ის ID-ს, სახელსა და status metadata-ს; UI იღებს მხოლოდ იმავე არასაიდუმლო მონაცემებს.

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
