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
  { match: /amadeo rose|rose amber/i, response: "Amadeo Rose Amber 50 მლ-ის ხელმისაწვდომობა და ფასი მხოლოდ მიმდინარე კატალოგის ჩანაწერიდან უნდა დადასტურდეს." },
  { match: /vanilla noir/i, response: "Vanilla Noir-ის მოცულობა, ფასი და მარაგი მხოლოდ Amadeo-ის მიმდინარე კატალოგის მონაცემებით უნდა დაზუსტდეს." },
  { match: /citrus atelier/i, response: "Citrus Atelier-ის შესახებ შეგვიძლია დავადასტუროთ მხოლოდ catalog-ში დამატებული მოცულობა, ფასი და ხელმისაწვდომობა." },
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
      text: "ზუსტ დეტალს Amadeo-ის გუნდთან გადავამოწმებ და მალე დაგიბრუნდებით.",
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
