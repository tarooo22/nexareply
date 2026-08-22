# NexaReply Meta rollout — owner-ის უსაფრთხო გზამკვლევი

**განახლება:** 2026-08-22  
**მოქმედი production Page:** Khavsi  
**მიზანი:** NexaReply-ის საჯარო self-service Meta Page connection-ის მომზადება ისე, რომ არსებული Khavsi კავშირი, tenant isolation და server-side secret boundary არ დაზიანდეს.

## მიმდინარე მდგომარეობა

NexaReply-ის OAuth, Page selection, webhook verification, App Secret Proof, idempotent inbound event storage, server-side send adapter, encrypted tenant vault და owner-facing status UX კოდის დონეზე მზად არის და ტესტირებულია. მიმდინარე generic OAuth fallback განკუთვნილია მხოლოდ Meta App Admin/Developer/Tester როლების მქონე ანგარიშებისთვის. არ უნდა ჩაითვალოს, რომ სრულიად გარე Facebook ანგარიში უკვე production-ready გზით დაერთვება.

Meta-ს ოფიციალური Access Levels დოკუმენტაციის მიხედვით, Standard Access მუშაობს მხოლოდ app role-ის მქონე მომხმარებლებთან, ხოლო role-ის არმქონე მომხმარებლებისთვის საჭიროა Advanced Access; Advanced Access შესაბამის permission/feature-ზე App Review-ით მტკიცდება და შეიძლება Business Verification-საც მოითხოვდეს. [1]

## Owner-ის მოქმედებების სწორი თანმიმდევრობა

| ეტაპი | რა უნდა გააკეთოს owner-მა | როგორ ვამოწმებთ | რა არ უნდა შეიცვალოს |
|---|---|---|---|
| 1. Business-ის მიბმა | Meta App Dashboard → Settings → Basic → Verification-ში მიაბით NexaReply App იმ Business-ს, რომლის Admin-იც ხართ. თუ Business unverified-ია, Business Manager-ში დაიწყეთ verification. | App Dashboard-ში Verification უნდა აჩვენებდეს დაკავშირებულ verified Business-ს. | არ შეცვალოთ NexaReply-ის managed secrets ან Khavsi Page.
| 2. App Review-ის მომზადება | App Review → Permissions and Features-ში მოამზადეთ მხოლოდ რეალურად გამოყენებული permission-ები. | თითოეულ permission-ს უნდა ჰქონდეს მკაფიო use case და reviewer evidence. | არ მოითხოვოთ ზედმეტი permission მხოლოდ იმიტომ, რომ ძველ fallback scope-ში იყო.
| 3. Reviewer evidence | მოამზადეთ test account/test Page screencast: login, Page selection, webhook-connected state, inbound message, AI draft/evidence, operator takeover და reply send. | ვიდეოში ყველა requested permission-ის grant და მისი გამოყენება უნდა ჩანდეს. | არ ჩაწეროთ რეალური customer data, Page token, App Secret, Verify Token ან raw payload.
| 4. Advanced Access / review | Meta-ს მოთხოვნის მიხედვით წარადგინეთ permission/feature review და დაელოდეთ approval-ს. | App Dashboard-ში შესაბამისი access level/approval უნდა იყოს აქტიური. | სანამ approval არ არის, გარე account-ის წარმატებას ნუ გამოაცხადებთ.
| 5. Public/Live რეჟიმი | მხოლოდ approval-ებისა და policy/business მოთხოვნების დასრულების შემდეგ შეცვალეთ App-ის public/live მდგომარეობა Meta Dashboard-ში. | შეამოწმეთ, რომ app role-ის არმქონე test account-ს authorization flow ხელმისაწვდომია. | არ გააკეთოთ Live switch მხოლოდ ერთი დადებითი role-user ტესტის საფუძველზე.
| 6. გარე account retest | გამოიყენეთ Facebook ანგარიში, რომელსაც App-ზე Admin/Developer/Tester role არ აქვს, მაგრამ test Page-ზე საჭირო Page access აქვს. დაიწყეთ NexaReply → ინტეგრაციები → Meta Messenger → Facebook-ით ავტორიზაცია. | უნდა დასრულდეს authorization, Page selection/auto-connect, subscription და connected state. | არ დააკოპიროთ provider token ან authorization code ჩატში.
| 7. Verify Token rotation | ჯერ შეინახეთ ახალი შემთხვევითი Verify Token NexaReply-ის managed secret-ში, შემდეგ Meta Webhooks settings-ში ჩაწერეთ იგივე ახალი მნიშვნელობა და გაიარეთ GET verification. | Meta callback უნდა დააბრუნოს challenge; POST signature verification უნდა დარჩეს მოქმედი. | არ გამოაჩინოთ replacement value ჩატში, screenshot-ში, source code-ში ან ticket-ში.

## Permission-ის პრაქტიკული rationale

`pages_show_list` გამოიყენება ავტორიზებული ანგარიშისთვის Page candidates-ის აღმოსაჩენად. `pages_manage_metadata` საჭიროა არჩეულ Page-ზე Messenger/Webhooks subscription-ისთვის. `pages_messaging` საჭიროა Page-დან Messenger reply-ის გასაგზავნად. `pages_read_engagement` გამოიყენეთ მხოლოდ მაშინ, თუ მიმდინარე Meta configuration ან კონკრეტული Graph operation ამას რეალურად მოითხოვს; NexaReply-ის ახლანდელი manual Page identity validation Page-token self-identity endpoint-ზეა გადაყვანილი, რათა ზედმეტი Page metadata lookup არ გახდეს blocker. `business_management` არ არის ყველა direct Page-owner flow-ის ზოგადი მოთხოვნა; ის დაკავშირებულია მხოლოდ იმ optional fallback path-თან, რომელიც client-business/System User პასუხების შემთხვევაში გამოიყენება.

## Verify Token rotation-ის უსაფრთხო წესი

Rotation გააკეთეთ მხოლოდ მაშინ, როცა Meta Dashboard-ზე შეცვლას დაუყოვნებლივ შეძლებთ. ახალი მნიშვნელობა უნდა იყოს შემთხვევითი, გრძელი და მხოლოდ managed secret UI-ში შეიყვანოთ. ცვლილების შემდეგ Meta Webhooks → Callback URL-ზე გამოიყენეთ იგივე ახალი Verify Token. წარმატებული GET verification-ის შემდეგ გამოაგზავნეთ harmless test event და შეამოწმეთ 200 OK/Inbox persistence. თუ verification ვერ შესრულდა, ძველი მოქმედი მნიშვნელობა დაუბრუნეთ მხოლოდ protected settings UI-ით; value არ გამოაგზავნოთ ჩატში.

## რა არის უკვე მზად და რა არა

| საკითხი | სტატუსი |
|---|---|
| OAuth callback, owner-scoped recovery და Page selection | კოდში მზად და ტესტირებული |
| X-Hub-Signature-256 და App Secret Proof | კოდში მზად და ტესტირებული |
| inbound event idempotency და tenant isolation | კოდში მზად და ტესტირებული |
| Khavsi-ის მოქმედი connection | დაცულია; ამ ეტაპზე არ შეცვლილა |
| გარე non-role Facebook account | ჯერ owner-side Meta approval/configuration და retest სჭირდება |
| Business Verification | owner-controlled, დასრულებულად არ ჩაითვალოს |
| App Review / Advanced Access | owner-controlled, დასრულებულად არ ჩაითვალოს |
| Verify Token rotation | owner-controlled; მხოლოდ coordinated window-ში გააკეთეთ |

> ამ გზამკვლევის მომზადებისას არ შეცვლილა Meta credentials, active Page connection, OAuth code path ან connector configuration. პროექტში დაემატა მხოლოდ audit findings და owner-side documentation.

## References

[1]: https://developers.facebook.com/docs/graph-api/overview/access-levels/ "Meta Access Levels — Standard and Advanced Access"

[2]: https://developers.facebook.com/documentation/development/release/business-verification "Meta Business Verification"

[3]: https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review/submission-guide "Meta App Review Submission Guide"
