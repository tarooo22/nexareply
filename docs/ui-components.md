# NexaReply — UI კომპონენტების სისტემა

## კომპონენტების პრინციპი

კომპონენტები იქმნება data-first, reusable და state-complete მიდგომით. თითოეული interactive ელემენტი უნდა იყოს keyboard-accessible, ჰქონდეს visible focus, loading/disabled/error მდგომარეობა და 44px მინიმალური touch target იქ, სადაც ეს მნიშვნელოვნად აუმჯობესებს მობილურ გამოყენებას. Interface icons მოდის Lucide SVG ნაკრებიდან; emoji არ გამოიყენება icon-ის მაგივრად.

| კომპონენტი | ვარიანტები | აუცილებელი მდგომარეობები |
|---|---|---|
| Button | primary, secondary, ghost, destructive, icon | default, hover, focus-visible, pressed, loading, disabled. |
| Status badge | open, pending, closed, needs-human, AI-active, human-active, demo, unconfigured | ტექსტური label და color ერთად; არა მხოლოდ ფერი. |
| App shell | public header, workspace sidebar, mobile drawer | expanded, collapsed, current route, keyboard focus. |
| Conversation row | default, selected, unread, ticketed, human-active | keyboard selection, unread marker, status label, truncation. |
| Message bubble | customer, AI draft, operator, system | timestamp, delivery state, source label, long-text wrap. |
| AI composer | suggestion, editor, tone selector, context card | loading, edited, blocked by takeover, sent, error. |
| Data table | products, leads, orders, tickets | loading skeleton, empty, filter-empty, error, pagination/overflow. |
| Import mapper | source column, destination field, required field | unmapped, valid, duplicate, invalid, importing, completed. |
| KPI card | metric, trend, supporting detail | loading, no-data, positive/neutral/attention state. |
| Empty state | inbox, products, search, notifications | explanation, primary action, optional secondary action. |

## Workspace shell

დიდ ეკრანზე sidebar აჩვენებს organization switcher-ს, Demo Mode badge-ს და ძირითადი route-ების ჯგუფებს: Overview, Conversations, Products, Knowledge Base, Leads & Orders, Analytics, Settings და Notifications. მობილურზე იგივე navigation ხელმისაწვდომია sheet/drawer-ში; მიმდინარე route, `aria-current` და close action უნდა იყოს მკაფიო. Role-aware navigation იმალება მხოლოდ მაშინ, როცა permission არ არსებობს; ამ hidden state-ს არ უნდა ახლდეს დამაბნეველი ცარიელი სივრცე.

## Inbox და AI reply კომპონენტები

Conversation interface არის desktop split-pane და mobile drill-in layout. List row აჩვენებს customer name-ს, preview-ს, განახლებას, status-ს და human takeover marker-ს. Thread panel აჩვენებს შეტყობინებებს reader-friendly სიგანეზე; customer, AI და operator message გამიჯნულია არა მარტო ფერით, არამედ sender label-ით. Details rail აჩვენებს contact, lead stage, products, ticket და audit activity-ს.

| მოქმედება | UI feedback | უსაფრთხოების წესი |
|---|---|---|
| Take over | `ადამიანმა ჩაიბარა` badge, AI composer disabled state და toast | AI ავტომატურად აღარ პასუხობს სანამ `Resume AI` არ მოხდება. |
| Send approved reply | inline sent state და ბოლო შეტყობინების thread entry | Demo Mode აშკარად აღნიშნავს შეტყობინებას როგორც სიმულირებულს. |
| Unknown answer | polite holding reply, `needs_human` ticket და notification item | ერთ conversation-ზე არ იქმნება დუბლირებული escalation. |
| Save to knowledge | confirmation dialog და draft knowledge item | არ ამატებს ფაქტს silently; საჭიროებს ოპერატორის დასტურს. |

## Forms, tables და feedback

Form field-ს აქვს მუდმივი visible label, optional/help text და inline error field-ის ახლოს. Select-ს არასდროს აქვს ცარიელი value. Table-ში filters და search mobile-ზე იცვლება stacked controls-ით; column overflow არ შეიძლება იწვევდეს გვერდის ჰორიზონტალურ scroll-ს. CSV/XLSX import mapper იყენებს პროგრესს, validation summary-ს და გასაგებ მოქმედებას თითოეული missing column-ისთვის.

## Responsive ქცევა

| კომპონენტი | 375px | 768px+ | 1024px+ |
|---|---|---|---|
| Sidebar | drawer | compact rail ან drawer | persistent sidebar. |
| Inbox | list → thread route | split view when space allows | 3-pane with optional detail rail. |
| KPI grid | 1 column | 2 columns | 3–4 columns. |
| Product table | condensed rows/cards | responsive table | full columns + actions. |
| Pricing | stacked cards | 2-column grid | 3-column comparison. |
| Composer actions | stacked buttons | inline actions | context panel and inline toolbar. |

## Motion და purposeful delight

Motion იყენებს opacity/transform transitions-ს, ჩვეულებრივ 160–240ms შუალედში. Loading copy მეგობრულია, მაგრამ არანაკლებ კონკრეტული: „AI პასუხს ამზადებს კატალოგის მიხედვით“ და „ფილტრები ახლდება“. Empty states საქმეზე მიჰყავს მომხმარებელი: „საუბრები ჯერ არ არის“ + „გახსენით Demo Messenger“. წარმატების feedback არის პატარა inline confirmation ან toast; არ გამოიყენება confetti, gamification ან layout-shifting animation. `prefers-reduced-motion: reduce` რეჟიმში არაარსებითი transition გათიშულია.
