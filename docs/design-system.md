# NexaReply — დიზაინის სისტემა

## არჩეული მიმართულება

NexaReply-ის ვიზუალური სისტემა აერთიანებს balanced-modern B2B SaaS სტრუქტურას, ზომიერ სიმკვრივეს და მცირე, ფუნქციურ motion-ს. UI/UX design intelligence ძიებამ დააბრუნა „Hero + Features + CTA“ marketing pattern და calm SaaS მიმართულება; ამ რეკომენდაციას ვაზუსტებთ brief-ის სავალდებულო Georgian-first ტიპოგრაფიითა და ფერებით. ამიტომ გენერირებული default blue/orange პალიტრა არ გამოიყენება როგორც საბოლოო brand token.

| პარამეტრი | მიღებული გადაწყვეტილება |
|---|---|
| Visual variance | 4/10 — balanced, modern, არაძალადობრივი კომპოზიცია. |
| Motion | 3/10 — მხოლოდ state-aware 150–300ms transitions. |
| Density | 6/10 — dashboard-ისთვის საკმარისად კომპაქტური, მაგრამ 44px touch target-ების დაცვით. |
| Marketing pattern | Hero, trust/context block, ფუნქციები, use cases, pricing, FAQ და CTA. |
| Dashboard pattern | persistent sidebar დიდ ეკრანზე; mobile sheet navigation მცირე ეკრანზე. |

## Design tokens

| Token | Light mode | Dark mode | გამოყენება |
|---|---:|---:|---|
| `--nx-primary` | `#7C3AED` | `#A78BFA` | მთავარი CTA, აქტიური state, focus-related emphasis. |
| `--nx-accent` | `#0891B2` | `#22D3EE` | AI context, ინფორმაცია, მეორეხარისხოვანი emphasis. |
| `--nx-foreground` | `#1E1B4B` | `#F4F3FF` | სათაურები და ძირითადი ტექსტი. |
| `--nx-muted` | `#6B7280` | `#A7A6B8` | supporting text. |
| `--nx-surface` | `#FFFFFF` | `#1D1B2E` | cards და workspace surfaces. |
| `--nx-canvas` | `#FAFAFF` | `#151322` | page background. |
| `--nx-lavender` | `#F4F0FF` | `#272241` | subtle sections, selection backgrounds. |
| `--nx-success` | `#15803D` | `#4ADE80` | წარმატებული გაგზავნა და healthy state. |
| `--nx-warning` | `#B45309` | `#FBBF24` | attention და pending state. |
| `--nx-danger` | `#B91C1C` | `#F87171` | error და ticket escalation. |

## ტიპოგრაფია და სივრცე

Noto Sans Georgian არის primary UI და body typeface; fallback stack ინარჩუნებს Georgian მხარდაჭერას. Heading-ები შეიძლება გამოიყენოს იგივე ოჯახი 600–700 weight-ით, რათა ქართული ტექსტი თანმიმდევრულად და გამართულად გამოჩნდეს. Base ზომა არის 16px, line-height ძირითად ტექსტზე მინიმუმ 1.5, ხოლო data-dense table ტექსტზე 14px მხოლოდ მაშინ, თუ კონტრასტი და სივრცე საკმარისია.

| მასშტაბი | ზომა | გამოყენება |
|---|---:|---|
| `text-xs` | 12px | metadata და მოკლე სტატუსი; არა body copy. |
| `text-sm` | 14px | table cells, supporting content. |
| `text-base` | 16px | body, form labels, buttons. |
| `text-lg` | 18px | card titles. |
| `text-xl` | 20px | section labels. |
| `text-2xl` | 24px | dashboard page title. |
| `text-4xl` | 36px | landing hero, responsive downscaling-ით. |

Spacing ეფუძნება 4px grid-ს: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 და 80px. Card-ებს აქვს 16–24px შიდა padding; marketing section-ები 64–112px vertical rhythm-ს იყენებს ფართო ეკრანზე და 48–72px-ს მობილურზე.

## Accessibility და responsive წესები

ყველა ტექსტური კონტრასტი უნდა აკმაყოფილებდეს WCAG AA მინიმუმს. Keyboard focus არასოდეს იმალება; icon-only buttons იღებს `aria-label`-ს; interactive control მინიმუმ 44×44px არის მობილურზე. Hover state არ შეიძლება იყოს ინფორმაციის ერთადერთი გადამტანი. `prefers-reduced-motion` აუქმებს არაარსებით entrance motion-ს და ტოვებს UI-ს საბოლოო visual state-ში.

| Breakpoint | Layout decision |
|---|---|
| 375px | single-column; sidebar გადადის drawer-ში; inbox list და conversation view იყენებს დაბრუნების მკაფიო გზას. |
| 768px | ორ-სვეტიანი context layouts; filters იკეცება; cards შეიძლება 2 column იყოს. |
| 1024px | persistent sidebar და inbox split-pane; dashboard widgets 2–3 column grid-ზე. |
| 1440px | 12-column grid, ფართო conversation details და analytics panel; ტექსტის line length რჩება კონტროლირებულად. |

## კომპონენტების შერჩევა

პროექტის scaffold-ში უკვე არის თავსებადი shadcn/Radix კომპონენტები, Lucide icons, Recharts და AIChatBox. ეს კომპონენტები პირველ არჩევანს წარმოადგენს, რადგან ისინი იმავე React/Tailwind stack-შია და ხელმისაწვდომი ინსტალაციით მოდის. 21st component catalog-ის ინსტრუმენტების სიაზე წვდომა ამ session-ში დაბრუნდა `403 Forbidden`; ამიტომ მისგან არც component და არც კოდი არ არის კოპირებული ან წარმოდგენილი, როგორც შემოწმებული. თუ წვდომა აღდგება, შემდეგი ძებნა უნდა მოიცავდეს AI chat, dashboard card, pricing, upload და data table patterns-ს და შეამოწმოს მათი license/installation terms.

| საჭიროება | არჩეული საფუძველი | ადაპტაციის წესი |
|---|---|---|
| Inbox და AI conversation | არსებული `AIChatBox` + shadcn scroll/tabs | Georgian thread UI, approval flow და status badges. |
| Dashboard cards | shadcn Card + Lucide | metric hierarchy, არა generic template. |
| Pricing | Card, Button, Badge | ნამდვილი ფასები brief-იდან, არა testimonial-ები ან ხელოვნური rating. |
| Forms და settings | Form primitives, Input, Select, Switch | visible labels, inline validation, keyboard support. |
| Imports და tables | Table, Dialog, progress states | column mapping, validation feedback და no-data state. |

## Deliverable checklist

გამოშვებამდე უნდა შემოწმდეს გატეხილი მობილური layout-ის, მკრთალი ტექსტის, focus clipping-ის, hover-only action-ის, emoji icon-ის, text zoom-ისა და motion preference-ის საკითხები. Visual QA უნდა ჩატარდეს 375px, 768px, 1024px და 1440px ეკრანებზე როგორც light, ისე dark theme-ში.
