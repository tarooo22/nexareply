import crypto from "node:crypto";
import { promisify } from "node:util";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME } from "../shared/const";
import * as db from "./db";
import { ENV } from "./_core/env";

const scrypt = promisify(crypto.scrypt);
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function sessionKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) return false;
  const [algorithm, salt, expected] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expectedBytes = Buffer.from(expected, "base64url");
  return expectedBytes.length === actual.length && crypto.timingSafeEqual(expectedBytes, actual);
}

export async function createLocalSession(user: User) {
  return new SignJWT({ userId: user.id, type: "password" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionKey());
}

export async function authenticateLocalRequest(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    const userId = payload.userId;
    if (typeof userId !== "number" || payload.type !== "password") return null;
    const user = await db.getUserById(userId);
    if (!user || !user.passwordHash) return null;
    void db.updateLastSignedIn(user.id);
    return user;
  } catch {
    return null;
  }
}

export function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
