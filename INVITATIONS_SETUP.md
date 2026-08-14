# Organization invitations and email delivery

NexaReply-ის owner შეუძლია workspace-ის **operator** როლზე მოიწვიოს თანამშრომელი. Invitation flow მუშაობს მაშინაც, როცა email provider არ არის დაკონფიგურირებული: owner იღებს ერთჯერად secure link-ს და შეუძლია იგი ხელით გააზიაროს. Resend-ის კონფიგურაციის შემდეგ იგივე flow ავტომატურად აგზავნის transactional email-ს.

> **უსაფრთხოების წესი:** database ინახავს მხოლოდ invitation token-ის SHA-256 hash-ს. Raw bearer token არსებობს მხოლოდ იმ მომენტში, როცა owner ქმნის მოწვევას, email link-ში ან manual copy flow-ში. იგი აღარ ბრუნდება list/query პასუხებში.

## Owner flow

როგორც ორგანიზაციის owner, გახსენით **წევრები**, მიუთითეთ თანამშრომლის ელფოსტა და შექმენით მოწვევა. ერთ ელფოსტაზე თითო ორგანიზაციაში შეიძლება არსებობდეს მხოლოდ ერთი აქტიური მოწვევა. ახალი მოწვევა ავტომატურად აუქმებს ძველ pending invite-ს იმავე ელფოსტისთვის.

| მდგომარეობა | მნიშვნელობა | Owner-ის მოქმედება |
|---|---|---|
| **manual ბმული მზადაა** | Email delivery არ არის კონფიგურირებული. | გააზიარეთ UI-ში ნაჩვენები ერთჯერადი ბმული უსაფრთხო არხით. |
| **ელფოსტა გაგზავნილია** | Resend-მა მიიღო transactional email request. | დაელოდეთ მიმღების acceptance-ს; საჭიროების შემთხვევაში შექმენით ახალი მოწვევა. |
| **ელფოსტის გაგზავნა ვერ შესრულდა** | Provider-მა უარყო ან ვერ დაამუშავა email. | გამოიყენეთ ნაჩვენები manual link და გადაამოწმეთ sender/domain configuration. |
| **მოლოდინში** | Token ჯერ მოქმედია და არ არის მიღებული. | შეგიძლიათ გააუქმოთ ან გამოიყენოთ **ხელახლა გაგზავნა**. Resend აუქმებს ძველ token-ს და ქმნის ახალ ერთჯერად ბმულს. |
| **მიღებულია** | შესაბამისი ელფოსტით შესულმა მომხმარებელმა მიიღო invitation. | User ავტომატურად ემატება operator წევრად. |
| **ვადაგასულია / გაუქმებულია** | Token აღარ მოქმედებს. | შექმენით ახალი invite. |

Invitation მოქმედებს **7 დღე**, არის one-time და უნდა მიიღოს მხოლოდ იმ Manus OAuth ანგარიშმა, რომლის email ზუსტად ემთხვევა მოწვეულ მისამართს. Operator ვერ ქმნის, ვერ ხედავს და ვერ აუქმებს მოწვევას; ყველა ასეთი პროცედურა server-side owner authorization-ს იყენებს.

## Optional Resend email delivery

Resend adapter default-ად გამორთულია. მის ჩასართავად დაამატეთ project **Secrets**-ში შემდეგი managed values:

| Managed key | მოთხოვნილი მნიშვნელობა |
|---|---|
| `RESEND_API_KEY` | Resend API key; გამოიყენება მხოლოდ server-side `Authorization: Bearer` header-ში. |
| `RESEND_FROM_EMAIL` | Verified sender, მაგალითად `NexaReply <invites@your-domain.com>`. |
| `INVITATION_BASE_URL` | `https://nexareply-2chxuc4s.manus.space` ან თქვენი future custom HTTPS domain. |

Resend-ისთვის საჭიროა თქვენ მიერ მფლობელობაში არსებული და Resend-ში verified sender domain; მათი დოკუმენტაცია მოითხოვს შესაბამის DNS records-ს (DKIM/SPF), სანამ email გაიგზავნება. [1] Adapter იყენებს `POST https://api.resend.com/emails` request-ს `from`, `to`, `subject`, `html` და provider-level `Idempotency-Key` header-ით, რაც duplicate outbound email-ის რისკს ამცირებს. [2]

თუ რომელიმე value არ არის მითითებული, NexaReply **არ ცდილობს** provider request-ს და ქმნის `manual_ready` invitation-ს. ეს უსაფრთხო fallback-ია და არ ნიშნავს email delivery-ის წარმატებას.

## Recipient flow

მიმღები ხსნის `/invite/<one-time-token>` ბმულს. თუ ჯერ ავტორიზებული არ არის, სისტემა იწყებს Manus OAuth login-ს და login-ის შემდეგ აბრუნებს იმავე invite link-ზე. Acceptance-ის დროს server ამოწმებს token hash-ს, expiration-ს, `pending` მდგომარეობას და signed-in მომხმარებლის normalized email-ს. წარმატების შემდეგ იქმნება ან ინარჩუნებს ორგანიზაციის `operator` membership-ს, ხოლო invitation ხდება `accepted`.

Never paste invitation links into public tickets, screenshots or repository files. Owner ვერ იღებს raw token-ს list endpoint-იდან და ვერ აღადგენს მას მოგვიანებით. **ხელახლა გაგზავნა** ავტომატურად აუქმებს წინა token-ს, ქმნის ახალს და ინახავს audit event-ს; ძველი ბმული მაშინვე მიუწვდომელი ხდება.

## Delivery and operational limits

Email provider-ის `sent` პასუხი ადასტურებს მხოლოდ provider request-ის მიღებას; იგი არ წარმოადგენს inbox delivery, reading ან acceptance გარანტიას. Monitor delivery-failed state და გამოიყენეთ manual fallback მხოლოდ დამოწმებულ recipient-თან.

ეს invitation flow არ ცვლის Meta სამუშაოს შეზღუდვას: `background_jobs` ინარჩუნებს debounce target-ს, მაგრამ 10-წამიანი production execution ისევ მოითხოვს ცალკე durable worker/queue hosting configuration-ს.

## References

[1] [Resend: Add and verify a domain](https://resend.com/docs/add-a-domain)

[2] [Resend Email API: Send email](https://resend.com/docs/api-reference/emails/send-email)
