# NexaReply — უსაფრთხო ავტომატური პასუხის პოლიტიკა (Option A)

**სტატუსი:** Owner-approved implementation policy

## მიზანი და ნაგულისხმევი მდგომარეობა

`Safe auto-reply` არის თითოეული ორგანიზაციისთვის ცალკე, **owner-only** პარამეტრი და მისი საწყისი მნიშვნელობა ყოველთვის გამორთულია. გააქტიურება არ ხსნის ახალ Meta OAuth, token, App Secret ან Verify Token surface-ს; არსებული server-side Meta send adapter გამოიყენება უცვლელად.

## გაგზავნის წესი

Worker-ს შეუძლია გარეთ გაგზავნოს პასუხი მხოლოდ მაშინ, როცა ყველა ქვემოთ მოცემული პირობა ერთდროულად მართალია.

| შემოწმება | მოთხოვნა | უარყოფის შედეგი |
|---|---|---|
| Workspace scope | Job-ის organization scope ემთხვევა conversation-ის organization-ს | Job retry/failure lifecycle; სხვა tenant-ს არ ეხება |
| Entitlement | `ai_automation` ხელმისაწვდომია server-side | არაფერი იგზავნება; outcome არის blocked |
| Owner setting | `autoReplyEnabled` არის true მხოლოდ მიმდინარე organization-ში | იქმნება მხოლოდ AI draft, როგორც არსებული approval რეჟიმში |
| Conversation state | `humanActive=false` და `aiState=active`, დადასტურებული პასუხის შექმნამდეც და უშუალოდ გაგზავნამდეც | არაფერი იგზავნება |
| Grounding | Outcome არის მხოლოდ `catalog` ან `knowledge`; fallback არასდროს იგზავნება | იქმნება handoff ticket/alert და AI გადადის `needs_human` რეჟიმში |
| Delivery identity | Conversation-ს აქვს Meta PSID და tenant Meta connection არის connected | არაფერი იგზავნება; delivery failure ჩანს Inbox-ში |
| Duplicate control | ერთი leased job ამუშავებს მხოლოდ თავის ბოლო inbound event-ს; გამეორებითი job ვერ ქმნის მეორე outbound პასუხს | არსებული job idempotency/retry დაცვა |

## Audit და Inbox მნიშვნელობა

AI draft რჩება `sender=ai`, `isDraft=true`, `deliveryStatus=draft`. უსაფრთხო ავტომატური გაგზავნა ინახება როგორც `sender=ai`, `isDraft=false`, `automated=true`, `deliveryStatus=sent`; წარუმატებელი მცდელობა ინახება `deliveryStatus=failed`. ამით Inbox მკაფიოდ განასხვავებს მონახაზს, ოპერატორის პასუხს და AI-ის მიერ რეალურად გაგზავნილ პასუხს, ხოლო provider message ID ან token არასოდეს ხვდება client DTO-ში.

## ოპერაციული ზღვარი

Messenger-ის incoming message webhook არის event-triggered წყარო და Meta მოითხოვს endpoint-ის HTTPS დამუშავებას, signature validation-ს, deduplication-სა და დროულ `200 OK` პასუხს. NexaReply-ში ეს კონტრაქტი უკვე server-side არის დაცული. Auto-reply არ ცვლის იმ ფაქტს, რომ production-level 10-წამიანი SLA საჭიროებს დამტკიცებულ durable worker trigger/hosting-ს; Autoscale request lifecycle ასეთ გარანტიას არ იძლევა.[1]

## Public rollout ზღვარი

ეს ცვლილება არ ცვლის Meta-ის App Review/Advanced Access მოთხოვნას. Role-based test გარემოში არსებული Page connection-ით შეიძლება უსაფრთხო flow-ის შემოწმება, მაგრამ არაროლიანი მომხმარებლების customer messages-ის მისაღებად და მათ Page-ებზე საჯაროდ გამოსაყენებლად Meta მიუთითებს შესაბამის access requirement-ზე.[1]

## References

[1]: https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks "Meta Webhooks for Messenger Platform"
