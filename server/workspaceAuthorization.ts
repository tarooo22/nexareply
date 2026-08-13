import { TRPCError } from "@trpc/server";
import type { WorkspaceRole } from "./nexareplyRepository";

export function requireWorkspaceRole(role: WorkspaceRole, requiredRole: WorkspaceRole = "owner") {
  if (requiredRole === "owner" && role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "ეს მოქმედება მხოლოდ ორგანიზაციის მფლობელისთვისაა." });
  }
}
