export type DemoTone = "თბილი და კონკრეტული" | "ფორმალური" | "მოკლე და სწრაფი" | string;

export type DemoReplyInput = {
  history: Array<{ sender: "customer" | "ai" | "operator" | "system"; body: string }>;
  preferredProduct: string;
  tone: DemoTone;
  humanActive?: boolean;
};

export type DemoReplyResult = {
  text: string;
  decision: "suggest" | "escalate" | "blocked";
  reason: string;
  source: "catalog" | "fallback" | "human-takeover";
};

export type OwnerEvent = {
  type: "human_takeover" | "high_priority_lead" | "unknown_question";
  conversationId: string;
  dedupeKey: string;
  title: string;
  body: string;
};

const catalogFacts = [
  { match: /iphone 16 pro max/i, response: "iPhone 16 Pro Max 256GB შავი ფერი გვაქვს მარაგში. ფასი არის 3,699 GEL და ხელმისაწვდომია 0%-იანი განვადება 12 თვემდე." },
  { match: /pixel 9/i, response: "Google Pixel 9 128GB გვაქვს 2,099 GEL-ად. ხელმისაწვდომია 0%-იანი განვადება 10 თვემდე." },
  { match: /airpods pro 2/i, response: "AirPods Pro 2 გვაქვს მარაგში 699 GEL-ად, 12-თვიანი 0%-იანი განვადების შესაძლებლობით." },
];

function lastCustomerText(history: DemoReplyInput["history"]) {
  return [...history].reverse().find((message) => message.sender === "customer")?.body ?? "";
}

export function generateDemoReply(input: DemoReplyInput): DemoReplyResult {
  if (input.humanActive) {
    return { text: "", decision: "blocked", reason: "Human takeover აქტიურია; AI draft არ უნდა შეიქმნას.", source: "human-takeover" };
  }

  const customerText = lastCustomerText(input.history);
  const sourceText = `${input.preferredProduct} ${customerText}`;
  const fact = catalogFacts.find((item) => item.match.test(sourceText));
  if (!fact) {
    return {
      text: "ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით.",
      decision: "escalate",
      reason: "საუბრის კონტექსტში ვერ მოიძებნა დასაყრდენი კატალოგის ფაქტი.",
      source: "fallback",
    };
  }

  const prefix = input.tone === "ფორმალური" ? "გმადლობთ ინტერესისთვის. " : input.tone === "მოკლე და სწრაფი" ? "კი, " : "სიამოვნებით გიპასუხებთ. ";
  return {
    text: `${prefix}${fact.response} სურვილის შემთხვევაში, დაგეხმარებით შემდეგი ნაბიჯის დაზუსტებაშიც.`,
    decision: "suggest",
    reason: "პასუხი დაფუძნებულია Demo კატალოგის შესაბამის პროდუქტზე.",
    source: "catalog",
  };
}

export function createOwnerEvent(type: OwnerEvent["type"], conversationId: string, customer: string): OwnerEvent {
  const content = {
    human_takeover: { title: "ოპერატორის ჩართვა საჭიროა", body: `${customer}-ის საუბარი ხელით მართვაზე გადავიდა.` },
    high_priority_lead: { title: "მაღალი პრიორიტეტის ლიდი", body: `${customer}-ის საუბარში გამოვლინდა მაღალი ყიდვის განზრახვა.` },
    unknown_question: { title: "უცნობი კითხვა", body: `${customer}-ის კითხვას სჭირდება ოპერატორის დაზუსტება.` },
  }[type];
  return { type, conversationId, dedupeKey: `${type}:${conversationId}`, ...content };
}
