import { generateDemoReply, type DemoReplyInput, type DemoReplyResult } from "../shared/demo-ai";
import { invokeLLM, listLLMModels } from "./_core/llm";

export type AiProvider = "demo" | "forge-llm";
export type AiReplyOutput = DemoReplyResult & { provider: AiProvider };

/**
 * Production-ready seam for a future OpenAI-compatible provider. Demo Mode is
 * deliberately deterministic unless an explicit OPENAI_API_KEY is configured.
 * Secrets stay server-side and user-facing text never exposes provider details.
 */
export async function createContextAwareReply(input: DemoReplyInput): Promise<AiReplyOutput> {
  const deterministic = generateDemoReply(input);
  if (!process.env.OPENAI_API_KEY || deterministic.decision !== "suggest") {
    return { ...deterministic, provider: "demo" };
  }

  try {
    const models = await listLLMModels();
    const model = models.data.find((item) => item.id === "gpt-5-mini")?.id ?? models.data[0]?.id;
    const history = input.history.map((message) => `${message.sender}: ${message.body}`).join("\n");
    const response = await invokeLLM({
      model,
      maxTokens: 220,
      messages: [
        { role: "system", content: "You draft Georgian sales replies. Use only supplied product facts. If a fact is missing, reply exactly: ზუსტ დეტალს გადავამოწმებ და მალე დაგიბრუნდებით." },
        { role: "user", content: `Tone: ${input.tone}\nPreferred product: ${input.preferredProduct}\nConversation:\n${history}\nVerified draft baseline: ${deterministic.text}` },
      ],
    });
    const content = response.choices[0]?.message.content;
    const text = typeof content === "string" ? content.trim() : "";
    return text ? { ...deterministic, text, provider: "forge-llm" } : { ...deterministic, provider: "demo" };
  } catch (error) {
    console.warn("[NexaReply] AI adapter fallback to demo provider", error);
    return { ...deterministic, provider: "demo" };
  }
}
