export type DemoMessage = {
  id: string;
  sender: "customer" | "ai" | "operator" | "system";
  body: string;
  time: string;
};

export type DemoConversation = {
  id: string;
  customer: string;
  initials: string;
  phone: string;
  status: "open" | "pending" | "closed";
  humanActive: boolean;
  ticket: boolean;
  priority?: "high" | "normal";
  updated: string;
  preview: string;
  product: string;
  leadStage: "ახალი" | "კვალიფიცირებული" | "შეთანხმება" | "დრაფტ შეკვეთა";
  messages: DemoMessage[];
};

export const demoConversations: DemoConversation[] = [
  { id: "c1", customer: "ანა მჭედლიძე", initials: "ამ", phone: "+995 599 12 34 56", status: "open", humanActive: false, ticket: false, priority: "high", updated: "ახლა", preview: "Rose Amber 50 მლ გაქვთ?", product: "Rose Amber", leadStage: "კვალიფიცირებული", messages: [{ id: "m1", sender: "customer", body: "Rose Amber 50 მლ გაქვთ?", time: "12:04" }, { id: "m2", sender: "customer", body: "ამჟამინდელი ფასი მაინტერესებს.", time: "12:04" }, { id: "m3", sender: "ai", body: "Demo catalog-ში Rose Amber 50 მლ ჩანაწერია. რეალურ Amadeo workspace-ში გადაამოწმეთ მიმდინარე მარაგი და ფასი.", time: "12:05" }] },
  { id: "c2", customer: "გიორგი კაპანაძე", initials: "გკ", phone: "+995 577 20 19 12", status: "pending", humanActive: false, ticket: true, priority: "high", updated: "4 წთ", preview: "ჩემი აღწერით რომელი სუნამოა?", product: "უცნობი სუნამო", leadStage: "ახალი", messages: [{ id: "m4", sender: "customer", body: "ჩემი აღწერით რომელი სუნამოა?", time: "12:01" }, { id: "m5", sender: "ai", body: "ზუსტ დეტალს Amadeo-ის გუნდთან გადავამოწმებ და მალე დაგიბრუნდებით.", time: "12:01" }, { id: "m6", sender: "system", body: "შეიქმნა ticket: საჭიროა ოპერატორი", time: "12:01" }] },
  { id: "c3", customer: "სალომე ბერიძე", initials: "სბ", phone: "+995 555 44 11 90", status: "open", humanActive: true, ticket: false, updated: "8 წთ", preview: "ორიგინალობის policy სად ვნახო?", product: "Vanilla Noir", leadStage: "შეთანხმება", messages: [{ id: "m7", sender: "customer", body: "ორიგინალობის policy სად ვნახო?", time: "11:57" }, { id: "m8", sender: "operator", body: "დადასტურებულ ინფორმაციას მალე მოგაწვდით.", time: "11:58" }, { id: "m9", sender: "system", body: "ადამიანმა ჩაიბარა საუბარი", time: "11:58" }] },
  { id: "c4", customer: "ლაშა აბაშიძე", initials: "ლა", phone: "+995 598 76 43 21", status: "open", humanActive: false, ticket: false, updated: "14 წთ", preview: "Citrus Atelier-ის მოცულობა მაინტერესებს", product: "Citrus Atelier", leadStage: "კვალიფიცირებული", messages: [{ id: "m10", sender: "customer", body: "Citrus Atelier-ის მოცულობა მაინტერესებს.", time: "11:47" }, { id: "m11", sender: "ai", body: "მოცულობასა და ხელმისაწვდომობას მხოლოდ მიმდინარე catalog ჩანაწერიდან დავაზუსტებ.", time: "11:47" }] },
  { id: "c5", customer: "მარიამ ჯაფარიძე", initials: "მჯ", phone: "+995 591 20 45 66", status: "closed", humanActive: false, ticket: false, updated: "25 წთ", preview: "მიწოდების წესი მაინტერესებს", product: "Rose Amber", leadStage: "დრაფტ შეკვეთა", messages: [{ id: "m12", sender: "customer", body: "მიწოდების წესი მაინტერესებს.", time: "11:36" }, { id: "m13", sender: "ai", body: "დადასტურებულ მიწოდების წესს Amadeo-ის ცოდნის ბაზიდან შეგატყობინებთ.", time: "11:36" }] },
  { id: "c6", customer: "ნიკა კუბლაშვილი", initials: "ნკ", phone: "+995 568 90 89 20", status: "open", humanActive: false, ticket: false, updated: "32 წთ", preview: "Vanilla Noir-ის ნოტები რა არის?", product: "Vanilla Noir", leadStage: "ახალი", messages: [{ id: "m14", sender: "customer", body: "Vanilla Noir-ის ნოტები რა არის?", time: "11:29" }, { id: "m15", sender: "ai", body: "კატალოგში დამოწმებული აღწერის გარეშე ზუსტ ნოტებს არ ვიგონებ — ოპერატორი დააზუსტებს.", time: "11:29" }] },
  { id: "c7", customer: "თამარ ებრალიძე", initials: "თე", phone: "+995 593 10 60 70", status: "pending", humanActive: false, ticket: true, updated: "47 წთ", preview: "კორპორაციული gifting პირობები", product: "სპეციალური შეკვეთა", leadStage: "ახალი", messages: [{ id: "m16", sender: "customer", body: "კორპორაციული gifting პირობები გაქვთ?", time: "11:14" }, { id: "m17", sender: "ai", body: "ზუსტ დეტალს Amadeo-ის გუნდთან გადავამოწმებ და მალე დაგიბრუნდებით.", time: "11:14" }] },
];

export const demoProducts = [
  { id: "p1", brand: "Amadeo Demo", model: "Rose Amber", storage: "50 მლ", color: "მარაგშია", price: "159", stock: 6, installment: "დემო ფასი", warranty: "სადემონსტრაციო ჩანაწერი" },
  { id: "p2", brand: "Amadeo Demo", model: "Vanilla Noir", storage: "100 მლ", color: "მარაგშია", price: "189", stock: 3, installment: "დემო ფასი", warranty: "სადემონსტრაციო ჩანაწერი" },
  { id: "p3", brand: "Amadeo Demo", model: "Citrus Atelier", storage: "50 მლ", color: "შეზღუდული მარაგი", price: "139", stock: 2, installment: "დემო ფასი", warranty: "სადემონსტრაციო ჩანაწერი" },
];

export const demoAnalytics = [
  { day: "ორშ", ai: 9, human: 4 },
  { day: "სამ", ai: 12, human: 5 },
  { day: "ოთხ", ai: 10, human: 3 },
  { day: "ხუთ", ai: 14, human: 6 },
  { day: "პარ", ai: 16, human: 7 },
  { day: "შაბ", ai: 11, human: 4 },
  { day: "კვი", ai: 8, human: 3 },
];

export const demoKnowledgeFacts = [
  { title: "Demo მიწოდების წესი", body: "ეს არის საჯარო დემო მონაცემი. რეალურ Amadeo workspace-ში დაამატეთ დადასტურებული მიწოდების პირობები." },
  { title: "Demo გადახდის წესი", body: "ეს არის საჯარო დემო მონაცემი. რეალური გადახდის პირობები შეავსეთ დაცული ცოდნის ბაზაში." },
  { title: "Demo ორიგინალობის წესი", body: "ეს არის საჯარო დემო მონაცემი. რეალური authenticity policy დაამატეთ დაცულ workspace-ში." },
  { title: "Demo დაბრუნების წესი", body: "ეს არის საჯარო დემო მონაცემი. რეალური დაბრუნების პირობები owner-მა უნდა დაადასტუროს." },
];
