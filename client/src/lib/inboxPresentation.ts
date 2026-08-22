export function inboxMessageAuthorLabel(sender: "customer" | "ai" | "operator" | "system", isDraft: boolean) {
  if (sender === "customer") return "მომწერი: კლიენტი";
  if (sender === "ai") return isDraft ? "ავტორი: NexaReply AI · მონახაზი" : "ავტორი: NexaReply AI";
  if (sender === "operator") return "უპასუხა: ოპერატორმა";
  return "სისტემური მოვლენა";
}

export function inboxDeliveryLabel(status: string) {
  const labels: Record<string, string> = {
    received: "შემომავალი",
    draft: "ჯერ არ არის გაგზავნილი",
    queued: "რიგშია გასაგზავნად",
    sent: "Facebook გვერდიდან გაიგზავნა",
    failed: "გაგზავნა ვერ მოხერხდა",
  };
  return labels[status] ?? "შენახულია";
}
