import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(), listLLMModels: vi.fn() }));
vi.mock("./nexareplyRepository", () => ({ nexareplyRepository: { createKnowledgeSourceWithDrafts: vi.fn() } }));

import { invokeLLM, listLLMModels } from "./_core/llm";
import { knowledgeDraftService } from "./knowledgeDraftService";
import { nexareplyRepository } from "./nexareplyRepository";

const scope = { organizationId: 901, role: "owner" as const, isDemo: false, actorUserId: 42 };
const source = { title: "Amadeo წესები", originalText: "თბილისში მიწოდება ხელმისაწვდომია. დაბრუნების წესი წინასწარ უნდა დაზუსტდეს." };

describe("knowledgeDraftService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listLLMModels).mockResolvedValue({ object: "list", data: [{ id: "gpt-5-mini", object: "model", created: 1, owned_by: "openai" }] });
    vi.mocked(nexareplyRepository.createKnowledgeSourceWithDrafts).mockResolvedValue({ id: 71, status: "draft" } as never);
  });

  it("persists original merchant text and pending normalized drafts, never approved facts", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ id: "result", created: 1, model: "gpt-5-mini", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ items: [{ title: "მიწოდება", body: "თბილისში მიწოდება ხელმისაწვდომია.", category: "delivery", confidence: 94 }] }) } }] });
    await expect(knowledgeDraftService.generate(scope, source)).resolves.toMatchObject({ id: 71, status: "draft" });
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini", response_format: expect.objectContaining({ type: "json_schema" }) }));
    expect(nexareplyRepository.createKnowledgeSourceWithDrafts).toHaveBeenCalledWith(scope, expect.objectContaining({ ...source, items: [expect.objectContaining({ category: "delivery", confidence: 94 })] }));
  });

  it("rejects malformed structured output before any source or fact is persisted", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ id: "result", created: 1, model: "gpt-5-mini", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "not-json" } }] });
    await expect(knowledgeDraftService.generate(scope, source)).rejects.toThrow();
    expect(nexareplyRepository.createKnowledgeSourceWithDrafts).not.toHaveBeenCalled();
  });
});
