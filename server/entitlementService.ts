import { TRPCError } from "@trpc/server";
import { nexareplyRepository, type WorkspaceScope } from "./nexareplyRepository";

type EntitlementAction = "meta_channel" | "member" | "ai_automation" | "ai_reply";

function unavailable(message: string) {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

export async function requireEntitlement(scope: WorkspaceScope, action: EntitlementAction) {
  const entitlements = await nexareplyRepository.getEntitlements(scope);
  if (entitlements.subscriptionStatus === "expired" || entitlements.subscriptionStatus === "cancelled" || entitlements.subscriptionStatus === "past_due") {
    unavailable("ამ workspace-ის trial ან plan აქტიური არ არის.");
  }
  if (action === "meta_channel" && entitlements.channels < 1) unavailable("ამ plan-ზე Messenger არხი ხელმისაწვდომი არ არის.");
  if (action === "ai_automation" && !entitlements.aiAutomation) unavailable("AI automation ამ plan-ზე ჩართული არ არის.");
  return entitlements;
}

export async function requireMemberCapacity(scope: WorkspaceScope) {
  const entitlements = await requireEntitlement(scope, "member");
  const members = await nexareplyRepository.listMemberships(scope);
  if (members.length >= entitlements.memberLimit) unavailable("ამ workspace-ის წევრების plan limit მიღწეულია.");
  return entitlements;
}
