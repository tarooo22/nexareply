# Amadeo Perfume Workspace

## მიზანი

NexaReply-ის დაცული workspace არის **Amadeo perfume-store** ოპერაციული გარემო. ყველა დაცული ეკრანი კითხულობს და ცვლის მხოლოდ მიმდინარე ორგანიზაციის persistent მონაცემებს. მომხმარებელი სხვა ორგანიზაციის მონაცემებს ვერ კითხულობს და ვერ ცვლის.

| ეკრანი | Persistent წყარო | ოპერაციული მოქმედება |
|---|---|---|
| მიმოხილვა | `conversations`, `tickets`, `leads`, `notifications`, `messages` | დღიური ოპერაციული მდგომარეობის ნახვა |
| საუბრები | `conversations`, `messages`, `conversation_participants` | Inbound history, AI draft, manual reply, takeover, delivery status |
| პროდუქტები | `products`, `product_variants`, `product_imports` | perfume catalog შექმნა, არქივი, CSV/XLSX import და CSV export |
| ცოდნის ბაზა | `knowledge_facts` | დადასტურებული delivery, payment, location, authenticity, returns და policy facts |
| AI კონსულტანტი | `organizations`, catalog და knowledge tables | persona მართვა და safe-answer source visibility |
| Tickets | `tickets`, `conversations` | unknown-request და human-handoff queue-ის დასრულება |
| ანალიტიკა | `conversations`, `messages`, `leads`, `draft_orders` | რეალური message volume, AI/human პასუხები, handoff და order metrics |
| Alerts | `notifications` | ხელით რეაგირების საჭიროება და read state |

## სუნამოების კატალოგი

პროდუქტის record-ს აქვს **ბრენდი**, **სურნელის დასახელება**, **SKU**, **მოცულობა**, **ფასი GEL**, **მარაგი**, **ხელმისაწვდომობა** და **აღწერა**. არსებული `product_variants.storage`/`color` columns compatibility layer-ად ინახავს volume/availability semantics-ს; UI და export უკვე perfume terminology-ს იყენებს.

CSV ან XLSX import-ის რეკომენდებული headers:

```text
ბრენდი,სურნელის დასახელება,SKU,მოცულობა,ფასი GEL,მარაგი,ხელმისაწვდომობა,აღწერა
```

Import ჯერ ქმნის preview-ს. მხოლოდ valid rows ინახება commit-ის შემდეგ. CSV export ინახავს იმავე perfume field order-ს. Owner-ს აქვს create/archive/import უფლებები; operator ხედავს რეალურ catalog-ს, მაგრამ ვერ ცვლის მას.

## AI კონსულტანტის უსაფრთხოების წესი

AI draft იყენებს მხოლოდ მიმდინარე ორგანიზაციის:

1. active perfume catalog record-ებს;
2. active knowledge-base fact-ებს;
3. organisation-level `aiPersona`, `aiTone`, `replyLength` და `fallbackMessage` settings-ს.

თუ კითხვაზე ვერ იძებნება დამოწმებული product ან policy fact, სისტემა **არ იგონებს** ფასს, მარაგს, ორიგინალობას, მიწოდების დროს ან დაბრუნების წესს. ამის ნაცვლად ინახავს fallback draft-ს, აჩერებს AI-ს, ქმნის idempotent open ticket-ს და ქმნის owner notification-ს.

## Messenger Inbox და delivery lifecycle

Inbox აჩვენებს conversation list-ს, real message history-ს, AI draft-ს, human takeover-ს და operator reply-ს. `messages.deliveryStatus` ინახავს ერთ-ერთ მდგომარეობას:

| სტატუსი | მნიშვნელობა |
|---|---|
| `received` | მიღებული inbound customer event |
| `draft` | შენახული AI draft, ჯერ არ არის გაგზავნილი |
| `queued` | დაგეგმილი outbound lifecycle (შემდგომი worker integration) |
| `sent` | manual ან Meta provider-ით წარმატებით გაგზავნილი პასუხი |
| `failed` | Meta delivery ვერ შესრულდა; ტექსტი ინახება troubleshooting-ისთვის |

Meta Page token, App secret, System User token და provider access token არ შედის არც tRPC response-ში, არც client bundle-ში და არც database record-ში. UI იღებს მხოლოდ უსაფრთხო Page ID/name/status metadata-ს.

## Alerts და ანალიტიკა

Alert იქმნება persistent `notifications` record-ად handoff, AI pause, human takeover ან high-priority lead event-ზე. ანალიტიკა იყენებს მხოლოდ tenant-scoped rows-ს: total conversations, AI/human replies, qualified leads, handoffs, draft orders და დღიური volume.

> `background_jobs` contract არსებობს debounce/event processing-ისთვის, თუმცა autoscale hosting-ზე 10-წამიანი debounce ჯერ არ არის production-durable. ამისთვის საჭიროა ცალკე durable worker/queue hosting configuration.

## რეალური ოპერირების დაწყება

1. Owner-მა დაამატოს რეალური Amadeo catalog CSV/XLSX import-ით ან Products ფორმიდან.
2. Owner-მა შეავსოს დადასტურებული ცოდნის ბაზა რეალური delivery/payment/location/authenticity/returns პირობებით.
3. Owner-მა დაარეგულიროს AI persona და fallback message AI კონსულტანტის გვერდზე.
4. Messenger-ზე შემოსული პირველი customer message ავტომატურად შექმნის persistent inbox conversation-ს.
5. უცნობი კითხვა გამოჩნდება Tickets და Alerts ეკრანზე human resolution-ისთვის.
