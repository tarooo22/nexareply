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
  { id: "c1", customer: "ანა მჭედლიძე", initials: "ამ", phone: "+995 599 12 34 56", status: "open", humanActive: false, ticket: false, priority: "high", updated: "ახლა", preview: "შავი ფერი მინდა", product: "iPhone 16 Pro Max", leadStage: "კვალიფიცირებული", messages: [{ id: "m1", sender: "customer", body: "iPhone 16 Pro Max გაქვთ?", time: "12:04" }, { id: "m2", sender: "customer", body: "რამდენია?", time: "12:04" }, { id: "m3", sender: "customer", body: "შავი ფერი მინდა", time: "12:05" }, { id: "m4", sender: "ai", body: "iPhone 16 Pro Max 256GB შავი ფერი გვაქვს მარაგში. ფასი არის 3,699 GEL. ხელმისაწვდომია 0%-იანი განვადება 12 თვემდე.", time: "12:05" }] },
  { id: "c2", customer: "გიორგი კაპანაძე", initials: "გკ", phone: "+995 577 20 19 12", status: "pending", humanActive: false, ticket: true, priority: "high", updated: "4 წთ", preview: "trade-in რამდენს შემიფასებთ?", product: "უცნობი შეფასება", leadStage: "ახალი", messages: [{ id: "m5", sender: "customer", body: "trade-in რამდენს შემიფასებთ ჩემს ძველ ტელეფონს?", time: "12:01" }, { id: "m6", sender: "ai", body: "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით.", time: "12:01" }, { id: "m7", sender: "system", body: "შეიქმნა ticket: საჭიროა ოპერატორი", time: "12:01" }] },
  { id: "c3", customer: "სალომე ბერიძე", initials: "სბ", phone: "+995 555 44 11 90", status: "open", humanActive: true, ticket: false, updated: "8 წთ", preview: "ფილიალიდან გატანა შეიძლება?", product: "Samsung Galaxy S25", leadStage: "შეთანხმება", messages: [{ id: "m8", sender: "customer", body: "ფილიალიდან გატანა შეიძლება დღესვე?", time: "11:57" }, { id: "m9", sender: "operator", body: "დიახ, საბურთალოს ფილიალიდან დღეს 20:00-მდე შეგიძლიათ გატანა.", time: "11:58" }, { id: "m10", sender: "system", body: "ადამიანმა ჩაიბარა საუბარი", time: "11:58" }] },
  { id: "c4", customer: "ლაშა აბაშიძე", initials: "ლა", phone: "+995 598 76 43 21", status: "open", humanActive: false, ticket: false, updated: "14 წთ", preview: "განვადებით პირველი შენატანი?", product: "Xiaomi 15", leadStage: "კვალიფიცირებული", messages: [{ id: "m11", sender: "customer", body: "Xiaomi 15 განვადებით პირველ შენატანს ითხოვს?", time: "11:47" }, { id: "m12", sender: "ai", body: "Xiaomi 15-ზე ხელმისაწვდომია 0%-იანი განვადება 12 თვემდე. დამატებითი პირობები დამოკიდებულია ბანკის გადაწყვეტილებაზე.", time: "11:47" }] },
  { id: "c5", customer: "მარიამ ჯაფარიძე", initials: "მჯ", phone: "+995 591 20 45 66", status: "closed", humanActive: false, ticket: false, updated: "25 წთ", preview: "მიწოდება რუსთავში", product: "Google Pixel 9", leadStage: "დრაფტ შეკვეთა", messages: [{ id: "m13", sender: "customer", body: "რუსთავში მიწოდება რამდენ ხანშია?", time: "11:36" }, { id: "m14", sender: "ai", body: "რუსთავში მიწოდება ჩვეულებრივ 1 სამუშაო დღეში ხდება. მიწოდების მისამართი მოგვწერეთ და დეტალს დაგიდასტურებთ.", time: "11:36" }] },
  { id: "c6", customer: "ნიკა კუბლაშვილი", initials: "ნკ", phone: "+995 568 90 89 20", status: "open", humanActive: false, ticket: false, updated: "32 წთ", preview: "გარანტია რამდენია?", product: "OnePlus 13", leadStage: "ახალი", messages: [{ id: "m15", sender: "customer", body: "OnePlus 13-ზე გარანტია რამდენია?", time: "11:29" }, { id: "m16", sender: "ai", body: "OnePlus 13-ს აქვს 24-თვიანი ოფიციალური გარანტია TechZone Demo-ის პირობებით.", time: "11:29" }] },
  { id: "c7", customer: "თამარ ებრალიძე", initials: "თე", phone: "+995 593 10 60 70", status: "pending", humanActive: false, ticket: true, updated: "47 წთ", preview: "კორპორაციული ფასდაკლება", product: "სპეციალური შეთავაზება", leadStage: "ახალი", messages: [{ id: "m17", sender: "customer", body: "კორპორაციულად 15 ტელეფონი თუ მინდა, ფასდაკლება გაქვთ?", time: "11:14" }, { id: "m18", sender: "ai", body: "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით.", time: "11:14" }] },
  { id: "c8", customer: "დავით კვარაცხელია", initials: "დკ", phone: "+995 574 21 21 21", status: "open", humanActive: false, ticket: false, updated: "1 სთ", preview: "ლურჯი ფერი თუ გაქვთ?", product: "Samsung Galaxy S25 Ultra", leadStage: "კვალიფიცირებული", messages: [{ id: "m19", sender: "customer", body: "Galaxy S25 Ultra ლურჯი ფერი თუ გაქვთ?", time: "10:51" }, { id: "m20", sender: "ai", body: "Galaxy S25 Ultra 256GB ტიტანის ლურჯი ფერი გვაქვს შეზღუდული მარაგით. ფასი 3,299 GEL-ია.", time: "10:51" }] },
  { id: "c9", customer: "ელენე კიკნაძე", initials: "ეკ", phone: "+995 599 33 29 00", status: "closed", humanActive: false, ticket: false, updated: "2 სთ", preview: "დამიმატეთ შეკვეთაში", product: "Apple AirPods Pro 2", leadStage: "დრაფტ შეკვეთა", messages: [{ id: "m21", sender: "customer", body: "AirPods Pro 2 დამიმატეთ შეკვეთაში, ხვალ საღამოს ავიღებ.", time: "09:45" }, { id: "m22", sender: "operator", body: "შენახულია draft შეკვეთად. დასადასტურებლად მოგვწერეთ სახელი და ტელეფონის ნომერი.", time: "09:47" }] },
  { id: "c10", customer: "ირაკლი სიხარულიძე", initials: "ის", phone: "+995 555 88 76 01", status: "open", humanActive: false, ticket: false, updated: "3 სთ", preview: "ფასში დამტენი შედის?", product: "Nothing Phone 3", leadStage: "ახალი", messages: [{ id: "m23", sender: "customer", body: "Nothing Phone 3-ს დამტენი მოყვება?", time: "08:42" }, { id: "m24", sender: "ai", body: "Nothing Phone 3-ის კომპლექტაციაში დამტენი არ შედის. სურვილის შემთხვევაში თავსებადი დამტენის შერჩევაშიც დაგეხმარებით.", time: "08:42" }] },
];

export const demoProducts = [
  { id: "p1", brand: "Apple", model: "iPhone 16 Pro Max", storage: "256GB", color: "შავი", price: "3,699", stock: 6, installment: "0% / 12 თვე", warranty: "24 თვე" },
  { id: "p2", brand: "Samsung", model: "Galaxy S25 Ultra", storage: "256GB", color: "ტიტანის ლურჯი", price: "3,299", stock: 3, installment: "0% / 12 თვე", warranty: "24 თვე" },
  { id: "p3", brand: "Samsung", model: "Galaxy S25", storage: "128GB", color: "ვერცხლისფერი", price: "2,199", stock: 11, installment: "0% / 12 თვე", warranty: "24 თვე" },
  { id: "p4", brand: "Google", model: "Pixel 9", storage: "128GB", color: "ვარდისფერი", price: "2,099", stock: 7, installment: "0% / 10 თვე", warranty: "24 თვე" },
  { id: "p5", brand: "Xiaomi", model: "Xiaomi 15", storage: "256GB", color: "თეთრი", price: "1,899", stock: 9, installment: "0% / 12 თვე", warranty: "24 თვე" },
  { id: "p6", brand: "OnePlus", model: "OnePlus 13", storage: "256GB", color: "მწვანე", price: "2,299", stock: 4, installment: "0% / 12 თვე", warranty: "24 თვე" },
  { id: "p7", brand: "Nothing", model: "Nothing Phone 3", storage: "256GB", color: "თეთრი", price: "1,599", stock: 8, installment: "0% / 10 თვე", warranty: "24 თვე" },
  { id: "p8", brand: "Apple", model: "AirPods Pro 2", storage: "—", color: "თეთრი", price: "699", stock: 14, installment: "0% / 6 თვე", warranty: "12 თვე" },
];

export const demoAnalytics = [
  { day: "ორშ", ai: 31, human: 15 },
  { day: "სამ", ai: 38, human: 17 },
  { day: "ოთხ", ai: 34, human: 13 },
  { day: "ხუთ", ai: 46, human: 20 },
  { day: "პარ", ai: 52, human: 21 },
  { day: "შაბ", ai: 41, human: 14 },
  { day: "კვი", ai: 29, human: 11 },
];

export const demoKnowledgeFacts = [
  { title: "ფილიალი და სამუშაო საათები", body: "საბურთალო, ვაჟა-ფშაველას გამზირი 42. ორშაბათი–შაბათი 10:00–20:00, კვირა 11:00–18:00." },
  { title: "მიწოდება", body: "თბილისში მიწოდება იმავე ან მომდევნო სამუშაო დღეს; რეგიონებში 1–3 სამუშაო დღე." },
  { title: "განვადება", body: "არჩეულ პროდუქტებზე მოქმედებს 0%-იანი განვადება 6–12 თვემდე. საბოლოო გადაწყვეტილებას ბანკი იღებს." },
  { title: "დაბრუნება და გაცვლა", body: "დაუბნეველი პროდუქტი ბრუნდება მოქმედი წესებისა და დოკუმენტის პირობების შესაბამისად." },
];
