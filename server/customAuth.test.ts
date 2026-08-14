import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getUserByNormalizedEmail: vi.fn(),
  getUserByEmail: vi.fn(),
  createPasswordUser: vi.fn(),
  updateLastSignedIn: vi.fn(),
  getUserById: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import { authenticateLocalRequest, createLocalSession, hashPassword, verifyPassword } from "./customAuth";
import { COOKIE_NAME } from "../shared/const";

const user = {
  id: 44,
  openId: "local_44",
  name: "Nexa Owner",
  email: "owner@example.com",
  normalizedEmail: "owner@example.com",
  passwordHash: "scrypt$test$hash",
  loginMethod: "password",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context() {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  return {
    cookies,
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} },
      res: {
        cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
        clearCookie: vi.fn(),
      },
    } as unknown as TrpcContext,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("custom email/password authentication", () => {
  it("hashes passwords with a salt and verifies without retaining plaintext", async () => {
    const hash = await hashPassword("long-secure-password");
    expect(hash).not.toContain("long-secure-password");
    await expect(verifyPassword("long-secure-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("registers a new account, sets an httpOnly session cookie and returns no credential fields", async () => {
    vi.mocked(db.getUserByNormalizedEmail).mockResolvedValue(undefined);
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.createPasswordUser).mockResolvedValue(user as never);
    const { ctx, cookies } = context();
    const response = await appRouter.createCaller(ctx).auth.register({ name: "Nexa Owner", email: "Owner@Example.com", password: "long-secure-password" });

    expect(response).toEqual({ id: 44, name: "Nexa Owner", email: "owner@example.com", role: "user" });
    expect(JSON.stringify(response)).not.toMatch(/password|hash|openId/i);
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, options: { httpOnly: true, secure: true } });
    expect(vi.mocked(db.createPasswordUser).mock.calls[0]?.[0]).toMatchObject({ normalizedEmail: "owner@example.com" });
    expect(vi.mocked(db.createPasswordUser).mock.calls[0]?.[0].passwordHash).not.toContain("long-secure-password");
  });

  it("rejects duplicate registration and invalid login credentials", async () => {
    vi.mocked(db.getUserByNormalizedEmail).mockResolvedValue(user as never);
    const duplicate = context();
    await expect(appRouter.createCaller(duplicate.ctx).auth.register({ name: "Nexa Owner", email: "owner@example.com", password: "long-secure-password" })).rejects.toMatchObject({ code: "CONFLICT" });

    vi.mocked(db.getUserByNormalizedEmail).mockResolvedValue(undefined);
    const login = context();
    await expect(appRouter.createCaller(login.ctx).auth.login({ email: "missing@example.com", password: "long-secure-password" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("logs in a valid password account and returns only public identity fields", async () => {
    const hash = await hashPassword("long-secure-password");
    vi.mocked(db.getUserByNormalizedEmail).mockResolvedValue({ ...user, passwordHash: hash } as never);
    const { ctx, cookies } = context();

    const response = await appRouter.createCaller(ctx).auth.login({ email: "OWNER@example.com", password: "long-secure-password" });

    expect(response).toEqual({ id: 44, name: "Nexa Owner", email: "owner@example.com", role: "user" });
    expect(JSON.stringify(response)).not.toMatch(/password|hash|openId/i);
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, options: { httpOnly: true, secure: true } });
    expect(db.updateLastSignedIn).toHaveBeenCalledWith(44);
  });

  it("projects auth.me to public identity fields and never exposes credential data", async () => {
    const { ctx } = context();
    ctx.user = user as never;

    const response = await appRouter.createCaller(ctx).auth.me();

    expect(response).toEqual({ id: 44, name: "Nexa Owner", email: "owner@example.com", role: "user" });
    expect(JSON.stringify(response)).not.toMatch(/password|hash|openId|normalizedEmail/i);
  });

  it("authenticates a signed local session only against a persisted password account", async () => {
    const token = await createLocalSession(user as never);
    vi.mocked(db.getUserById).mockResolvedValue(user as never);
    const request = { headers: { cookie: `${COOKIE_NAME}=${token}` } } as never;
    await expect(authenticateLocalRequest(request)).resolves.toMatchObject({ id: 44, email: "owner@example.com" });
    expect(db.updateLastSignedIn).toHaveBeenCalledWith(44);
  });

  it("rejects unsigned, malformed and legacy sessions without a password credential", async () => {
    await expect(authenticateLocalRequest({ headers: { cookie: `${COOKIE_NAME}=not-a-jwt` } } as never)).resolves.toBeNull();

    const token = await createLocalSession(user as never);
    vi.mocked(db.getUserById).mockResolvedValue({ ...user, passwordHash: null } as never);
    await expect(authenticateLocalRequest({ headers: { cookie: `${COOKIE_NAME}=${token}` } } as never)).resolves.toBeNull();
  });
});
