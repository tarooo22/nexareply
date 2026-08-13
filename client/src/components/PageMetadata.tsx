import { useEffect } from "react";
import { useLocation } from "wouter";

const metadataByRoute: Array<{ matches: (path: string) => boolean; title: string; description: string }> = [
  { matches: (path) => path === "/", title: "NexaReply — Messenger გაყიდვების AI სამუშაო სივრცე", description: "ქართული-first AI გაყიდვების სამუშაო სივრცე Messenger საუბრების, სანდო პასუხების, ლიდებისა და ადამიანური კონტროლისთვის." },
  { matches: (path) => path === "/pricing", title: "ფასები — NexaReply", description: "იხილეთ NexaReply-ის გეგმები და AI პასუხების მოცულობა თქვენი გაყიდვების გუნდისთვის." },
  { matches: (path) => path === "/privacy", title: "კონფიდენციალურობა — NexaReply", description: "გაეცანით NexaReply-ის მონაცემთა უსაფრთხოებისა და Demo Mode-ის კონფიდენციალურობის პრინციპებს." },
  { matches: (path) => path === "/terms", title: "გამოყენების პირობები — NexaReply", description: "NexaReply-ის AI პასუხების, Demo Mode-ისა და ოპერაციული კონტროლის გამოყენების პირობები." },
  { matches: (path) => path === "/contact", title: "კონტაქტი — NexaReply", description: "დაგეგმეთ თქვენი Messenger გაყიდვების workflow NexaReply-ით." },
  { matches: (path) => path.startsWith("/demo"), title: "TechZone Demo — NexaReply", description: "შესვლის გარეშე გამოსცადეთ NexaReply-ის AI sales workspace უსაფრთხო Demo Mode-ში." },
];

function updateMeta(selector: string, content: string) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute("content", content);
}

export function PageMetadata() {
  const [location] = useLocation();
  useEffect(() => {
    const entry = metadataByRoute.find((item) => item.matches(location)) ?? metadataByRoute[0];
    document.title = entry.title;
    updateMeta('meta[name="description"]', entry.description);
    updateMeta('meta[property="og:title"]', entry.title);
    updateMeta('meta[property="og:description"]', entry.description);
    updateMeta('meta[name="twitter:title"]', entry.title);
    updateMeta('meta[name="twitter:description"]', entry.description);
  }, [location]);
  return null;
}
