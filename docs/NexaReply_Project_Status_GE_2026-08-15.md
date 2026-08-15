# NexaReply — პროექტის სრული სტატუსი

**თარიღი:** 2026-08-15  
**Live მისამართი:** `https://nexareply-2chxuc4s.manus.space`  
**მიზანი:** NexaReply არის Georgian-first, multi-tenant AI sales workspace Facebook Messenger გაყიდვებისთვის. ბიზნესს უნდა შეეძლოს საკუთარი სამუშაო სივრცის შექმნა, Facebook Page-ის უსაფრთხოდ დაკავშირება, Inbox-ში შეტყობინებების დამუშავება, AI draft-ის გადახედვა და ადამიანის ჩარევის მართვა.

> **მთავარი პრინციპი:** თითოეული ორგანიზაცია იზოლირებულია. მომხმარებელი ვერ ხედავს სხვა ორგანიზაციის პროდუქტებს, მომხმარებლებს, საუბარს, ticket-ს, Meta Page-ს ან provider credential-ს.

## 1. რას აკეთებს საიტი ამ ეტაპზე

| მიმართულება | განხორციელებული ფუნქციონალი | მდგომარეობა |
| --- | --- | --- |
| Public საიტი | Georgian-first მთავარი გვერდი, პროდუქტის შესაძლებლობები, გამოყენების სცენარები, FAQ, ფასები, კონტაქტი, privacy, terms და data-deletion გვერდები. | Live |
| ავტორიზაცია | საკუთარი email/password რეგისტრაცია, login/logout, httpOnly session cookie, scrypt password hashing და დაცული workspace. | Live |
| Organizations | მომხმარებელს შეუძლია საკუთარი workspace-ის შექმნა; owner/operator roles და membership isolation server-side მოწმდება. | Live |
| Facebook Page OAuth | Owner ირჩევს Facebook OAuth flow-ს, შემდეგ Page-ს; ახალი tenant token მიდის მხოლოდ ორგანიზაციის encrypted server-side vault-ში. | Code მზადაა; Meta public rollout ჯერ დასრულებული არ არის |
| Amadeo pilot | Amadeo-ის არსებული Meta Page connection შენარჩუნებულია managed-token fallback გზით. | Live / უცვლელი |
| Inbox | Conversation list, thread, customer context, message status, evidence chips, AI draft, operator takeover, AI pause და handoff ticket. | Live |
| Catalog | Perfume catalog, photo gallery, CSV/XLSX preview/import და CSV export. | Live |
| Knowledge Base | Natural-language knowledge draft, approval-first selection/rejection, approved-only AI grounding. | Live |
| AI უსაფრთხოება | Store data-ზე დაფუძნებული draft; უცნობ კითხვაზე handoff ticket; human takeover AI პასუხს აჩერებს. | Live |
| Tickets და alerts | Persistent tickets, owner notifications, resolved/open state, analytics/alerts. | Live |
| გეგმები | Server-side plan/trial entitlements: automation, channels, member capacity და quota enforcement. | Live foundation; checkout ჯერ არ არის |
| Queue core | Tenant-aware jobs, idempotency, atomic leases, retry/backoff, lease recovery, dead-letter state, rate-limit buckets და owner-safe monitoring. | Live core |

## 2. არქიტექტურა და უსაფრთხოების მოდელი

NexaReply იყენებს **React 19 + TypeScript + Vite** frontend-სა და **Express 4 + tRPC 11** backend-ს. მუდმივი მონაცემები ინახება MySQL/TiDB-ში Drizzle ORM-ით. Repository/service layer UI-ს database-specific logic-ისგან აცალკევებს, რათა მომავალში სხვა მონაცემთა ბაზაზე გადასვლა შესაძლებელი დარჩეს.

| საზღვარი | განხორციელებული დაცვა |
| --- | --- |
| Tenant isolation | Organization ID და membership scope ყველა დაცულ server procedure-ში მოწმდება. |
| Meta credentials | ახალი ორგანიზაციის Page token ინახება მხოლოდ AES-256-GCM encrypted vault-ში; client DTO, logs და UI plaintext-ს ვერ იღებს. |
| Amadeo დაცვა | არსებული Page-ის managed fallback path არ გადაკეთებულა, არ შემობრუნებულა token და არ შექმნილა ახალი Page subscription. |
| Webhooks | GET verification, X-Hub-Signature-256 validation და inbound event idempotency მხარდაჭერილია. |
| Jobs | Organization-scoped dedupe key, atomic lease, retrying/dead-letter lifecycle და safe monitoring DTO. |
| Authorization | Owner-only membership, Meta integration, queue redrive და სხვა sensitive operations; operator denial ტესტებით არის დაფარული. |
| Data deletion | საჯარო ინსტრუქციის URL: `/data-deletion`; request უნდა დადასტურდეს ანგარიშის მფლობელთან, ხოლო vault credential ორგანიზაციის ფარგლებში იშლება. |

## 3. ამჟამინდელი Meta/Facebook მდგომარეობა

Meta Dashboard audit-მა დაადასტურა, რომ არსებული App-ში უკვე დამატებულია **Messenger**, **Webhooks** და **Facebook Login for Business**; webhook callback შეესაბამება NexaReply endpoint-ს. ასევე გამოსწორდა preview iframe პრობლემა: Facebook OAuth ახლა embedded preview-ის ნაცვლად ცალკე top-level tab-ში იხსნება.

თუმცა სრულიად ახალი Facebook მომხმარებლის Page OAuth ჯერ ფართოდ ხელმისაწვდომი არ არის. Meta Dashboard-ში არსებული business portfolio არის **Unverified**, ამიტომ Access Verification ჯერ დაბლოკილია. App Basic settings-ში ადრე დროებითი Facebook.com policy URLs იყო; ახლა NexaReply-ის სწორი public URLs უკვე live-ია და Meta Dashboard-ში ხელით უნდა ჩაიწეროს.

| აუცილებელი Meta ნაბიჯი | სტატუსი | სწორი მნიშვნელობა / შენიშვნა |
| --- | --- | --- |
| Privacy Policy URL | საიტზე live | `https://nexareply-2chxuc4s.manus.space/privacy` |
| Terms of Service URL | საიტზე live; Meta-ში უნდა განახლდეს | `https://nexareply-2chxuc4s.manus.space/terms` |
| Data Deletion Instructions URL | საიტზე live; Meta-ში უნდა განახლდეს | `https://nexareply-2chxuc4s.manus.space/data-deletion` |
| OAuth redirect URI | უკვე არსებული contract | `https://nexareply-2chxuc4s.manus.space/api/integrations/meta/callback` |
| Business Verification | საჭიროა owner-controlled ნაბიჯი | უნდა დასრულდეს არსებული business portfolio-ს დოკუმენტებით. |
| Access Verification | Business Verification-ის შემდეგ | საჭიროა Meta-ის მოთხოვნის მიხედვით. |
| Live mode / permission review | ჯერ დასადასტურებელია | მხოლოდ prerequisites-ის დასრულების შემდეგ უნდა გადაიყვანოთ public მდგომარეობაში. |
| External-account OAuth retest | ჯერ შესრულებული არაა | სრულდება Meta approval-ის შემდეგ. |

> Page-ზე **full control** აუცილებელია, მაგრამ მარტო ეს არ არის საკმარისი: სრულიად უცხო მომხმარებელს OAuth მხოლოდ მაშინ იმუშავებს, როდესაც NexaReply Meta App იქნება public-ready, Live და Meta-ის მოთხოვნილი access/review პირობები იქნება დაკმაყოფილებული.

## 4. Durable worker და 10-წამიანი SLA

Queue execution-ის application layer მზადაა: HMAC-authenticated callback, generic wakeup signal, retries, dead-letter state, rate limits და monitoring არსებობს. მაგრამ Cloudflare delayed Queue/Worker provisioning მომხმარებლის გადაწყვეტილებით **გადადებულია**.

ამიტომ ამჟამინდელი სწორი პოზიციაა:

| მოთხოვნა | სტატუსი |
| --- | --- |
| Durable job persistence, idempotency, leases, retry/dead-letter | მზადაა |
| Owner Inbox queue counts | მზადაა |
| Cloudflare external queue/worker | არ არის provisioned |
| რეალური 10-წამიანი production debounce guarantee | **არ არის ჩართული** |

## 5. QA და მიგრაციები

პროექტში განხორციელებულია ორგანიზაციები, subscription/entitlement, encrypted vault, Inbox evidence და durable queue lifecycle-ის additive migrations, მათ შორის `0011`–`0014` self-service SaaS/queue ეტაპებისთვის. ბოლო სრული OAuth-fix QA-მ დაადასტურა **91 passing test** და **2 managed-secret integration check intentionally skipped**. შემდეგ დაემატა data-deletion route-ის ცალკე regression test; TypeScript და production build წარმატებით დასრულდა.

ტესტები ფარავს tenant isolation-ს, role authorization-ს, OAuth session scoping-ს, vault plaintext boundary-ს, repeated webhook/job dedupe-ს, retry/dead-letter lifecycle-ს, secret-safe DTO-ს, catalog/knowledge workflow-სა და public legal route-ს.

## 6. რა ჯერ არ არის დასრულებული

| პრიორიტეტი | რატომ არის საჭირო |
| --- | --- |
| Meta Business Verification | აუცილებელია public access-ის და შემდგომი access verification-ისთვის. |
| Meta policy URLs-ის შენახვა Dashboard-ში | ახლა საიტზე არსებობს, მაგრამ არსებული Dashboard ველები უნდა განახლდეს. |
| Meta permissions/review/Live readiness | ამის გარეშე მესამე მხარის მომხმარებლის Facebook Login შეიძლება დაიბლოკოს. |
| External Facebook OAuth retest | უნდა გადაამოწმოს სრულიად სხვა account-ის რეალური Page selection flow. |
| Billing / checkout / plan upgrade | Plan foundation არსებობს, მაგრამ გადახდა და self-service upgrade ჯერ არ არის. |
| Cloudflare worker provisioning | საჭიროა მხოლოდ 10-წამიანი end-to-end SLA-ის რეალური გარანტიისთვის. |
| Public user-deletion request handling | ინსტრუქციის URL მზადაა; შემდეგი ეტაპია verified request form/workflow და deletion audit trail. |

## 7. უახლოესი უსაფრთხო ნაბიჯები

პირველ რიგში Meta Dashboard → **App settings → Basic**-ში უნდა განახლდეს Terms URL და Data Deletion Instructions URL ზემოთ მოცემული NexaReply მისამართებით; App secret, Client token, webhook callback და verify token არ უნდა შეიცვალოს. შემდეგ არსებული business portfolio-ის owner-მა უნდა დაასრულოს Business Verification. ამის შემდეგ ხდება Access Verification/permissions review და მხოლოდ Meta approval-ის შემდეგ External Facebook account OAuth retest.

შემდეგი პროდუქტის პრიორიტეტია **billing/checkout და plan upgrade flow**, ხოლო durable 10-second SLA მხოლოდ მაშინ უნდა გააქტიურდეს, როდესაც ცალკე Cloudflare Queue/Worker provision იქნება დადასტურებული.

## 8. Source archive-ის შინაარსი

თანდართული source archive შეიცავს ყველა version-controlled პროექტის ფაილს: React client, Express server, Drizzle schema/migrations, tests, documentation, configuration და package manifests. უსაფრთხოების მიზნით არქივი არ შეიცავს secrets, `.env` ფაილებს, `node_modules`, `.git` history, build output (`dist`) ან transient logs. ეს გამონაკლისები აუცილებელია, რადგან ისინი ან აღდგენადია dependency ინსტალაციით, ან შეიცავს გარემოსთვის სპეციფიკურ/კონფიდენციალურ მონაცემს.
