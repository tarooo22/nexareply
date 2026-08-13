# NexaReply — ტექნიკური არქიტექტურა

## Stack გადაწყვეტილება

Brief-ში სასურველია Next.js + App Router, თუმცა initialized NexaReply scaffold რეალურად იყენებს **React 19, TypeScript, Vite, Express, tRPC, Drizzle და MySQL-compatible მონაცემთა ფენას**. ამ MVP-ში stack არ იცვლება: ის უკვე უზრუნველყოფს typed server contract-ს, Manus OAuth-ს, მონაცემთა ბაზას, server-side service layer-სა და საიმედო Demo Mode-ის საფუძველს. ეს გადაწყვეტილება თავიდან გვაცილებს ინფრასტრუქტურული ცვლილებების რისკს და არ თმობს მოთხოვნილ ტიპურ სერვერ-ინტეგრაციებსა და ტესტირებას.

| ფენა | პასუხისმგებლობა |
|---|---|
| `client/` | React UI, Georgia-first routes, theme provider, accessible component system, tRPC queries/mutations. |
| `server/routers/` | მცირე, feature-oriented typed procedures conversations, products, analytics, AI suggestions და notifications-ისთვის. |
| `server/services/` | demo answer provider, მომავალში OpenAI/Meta/Telegram adapters, tenant checks და audit helpers. |
| `server/db.ts` | მონაცემთა წაკითხვა/ჩაწერის helpers, რომლებმაც organization boundary უნდა მიიღონ. |
| `drizzle/schema.ts` | normalized schema, relations და migration source of truth. |
| `shared/` | Zod-compatible types, demo fixtures და public constants. |
| `docs/` | UX, brand, UI, QA, setup და security decisions. |

## ინფორმაციული არქიტექტურა და route map

Public marketing pages არ იყენებს dashboard sidebar-ს. Demo Mode და შემდგომი authenticated workspace იყენებს ერთიან workspace shell-ს, თუმცა Demo route არ ითხოვს login-ს და პირდაპირ ტვირთავს იზოლირებულ TechZone Demo dataset-ს.

| Route | დანიშნულება | წვდომა |
|---|---|---|
| `/` | Georgian landing page | საჯარო |
| `/pricing` | გეგმები და reply quotas | საჯარო |
| `/privacy`, `/terms`, `/contact` | legal და contact views | საჯარო |
| `/demo` | TechZone Demo overview | საჯარო, no-login |
| `/demo/conversations` | inbox, thread და AI composer | საჯარო, no-login |
| `/demo/products` | კატალოგი, filtering და import preview | საჯარო, no-login |
| `/demo/knowledge` | business facts და FAQ | საჯარო, no-login |
| `/demo/leads` | contacts, leads და draft orders | საჯარო, no-login |
| `/demo/analytics` | response/conversion/reply metrics | საჯარო, no-login |
| `/demo/settings` | AI persona, rules, integrations, billing, notification states | საჯარო, no-login |
| `/app/*` | მომავალი authenticated organization workspace | დაცული |

## Tenant isolation და მონაცემთა კონტრაქტები

ყველა multi-tenant entity იღებს `organizationId`-ს. ნებისმიერ protected procedure-ს უნდა ჰქონდეს membership/role validation და query-ს წინ უნდა შეამოწმოს, რომ მოთხოვნილი record იმავე organization-ს ეკუთვნის. Demo Mode-ში ორგანიზაცია არის fixed `TechZone Demo`, მაგრამ მისი service pipeline იმავე contract-ს იღებს, რაც შემდეგ რეალურ workspace-ს ექნება.

| Contract | აუცილებელი ველები |
|---|---|
| Organization | `id`, `name`, `slug`, `mode`, `plan`, `aiTone`, `debounceSeconds`. |
| Product | `organizationId`, `brand`, `model`, `sku`, `category`, `storage`, `color`, `priceGel`, `stock`, `installment`, `warranty`, `active`. |
| Conversation | `organizationId`, `customer`, `status`, `aiState`, `humanActive`, `ticketId`, `updatedAt`. |
| Message | `conversationId`, `sender`, `body`, `deliveryState`, `createdAt`, `source`. |
| Ticket | `organizationId`, `conversationId`, `status`, `reason`, `priority`, `ownerNote`. |
| Lead / Draft Order | `organizationId`, `conversationId`, `stage`, `customer data`, `items`, `status`; არასოდეს `confirmed` ავტომატურად. |
| Audit Event | `organizationId`, `actor`, `action`, `target`, `payload`, `createdAt`. |

## Demo AI და integration boundary

AI suggestion service იღებს conversation history-ს, organization tone-ს, პროდუქტების სიას და business facts-ს. Demo provider უნდა აბრუნებდეს მხოლოდ იმ ინფორმაციას, რომელიც fixture-შია; უცნობ მოთხოვნაზე ქმნის ერთ `needs_human` ticket-ს და აბრუნებს უსაფრთხო ქართულ holding ტექსტს. OpenAI provider შეიქმნება server-side adapter-ის სახით მხოლოდ `OPENAI_API_KEY` გარემო ცვლადის არსებობისას. Meta და Telegram adapters ინახება disabled/unconfigured მდგომარეობაში, სანამ შესაბამისი server secrets და რეალური verification არ იარსებებს.

რეალურ webhook და queue workload-ს დასჭირდება გარედან მიღებული event-ის სწრაფი acknowledgment და გამძლე, background დამუშავება. Persistent foundation-ში debounce უკვე უნდა ინახებოდეს `background_jobs` ცხრილში: თითო incoming message transactionally ქმნის ან ანახლებს conversation-ის აქტიურ job-ს და იყენებს idempotency key-ს. მიმდინარე autoscaling runtime-ზე 10-წამიანი შესრულება არ ითვლება გარანტირებულად; ეს საჭიროებს მომავალ durable worker/scheduler hosting configuration-ს. რეალური Meta adapter-ის წინ საჭიროა ოფიციალური webhook შესაძლებლობის ხელახლა გადამოწმება, signature verification და შესაბამისი worker გადაწყვეტილება. არ უნდა გამოყენებულ იქნას წუთობრივად გაშვებული polling როგორც 10-წამიანი debounce-ის შემცვლელი.

## Theme და responsive foundation

ThemeProvider მუშაობს light default-ით, switchable რეჟიმით და `localStorage` persistence-ით. `light`, `dark` და `system` არჩევანი ხელმისაწვდომია header და workspace shell-იდან, keyboard-readable label-ებით. Styles უნდა გამოიყენებდეს CSS semantic tokens-ს; component-ში დაუცველად ჩაწერილი raw hex თავიდან უნდა იქნას აცილებული.

## უსაფრთხოების საფუძველი

Secrets არ უნდა მოხვდეს client code-ში, demo fixtures-ში, screenshots-ში ან logs-ში. მომავალი Meta access token-ები encrypt-at-rest მოითხოვს; webhook signatures, inbound event idempotency და outbound send idempotency უნდა მოექცეს server-side service layer-ში. PDF/TXT upload-ის bytes უნდა ინახებოდეს storage-ში, ხოლო database-ში მხოლოდ metadata/reference. Retention policy უნდა მინიმუმამდე ამცირებდეს conversation context-ს და იყოს დოკუმენტირებული რეალური credentials-ის ჩართვამდე.
