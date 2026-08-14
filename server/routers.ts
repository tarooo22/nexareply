import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { nexareplyRouter } from "./nexareplyRouter";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createLocalSession, hashPassword, normalizeEmail, publicUser, verifyPassword } from "./customAuth";
import { createPasswordUser, getUserByEmail, getUserByNormalizedEmail, updateLastSignedIn } from "./db";

const credentialsInput = z.object({
  email: z.string().email().max(320),
  password: z.string().min(10).max(128),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ? publicUser(ctx.user) : null),
    register: publicProcedure.input(credentialsInput.extend({ name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      const normalizedEmail = normalizeEmail(input.email);
      if (await getUserByNormalizedEmail(normalizedEmail) || await getUserByEmail(input.email.trim())) throw new TRPCError({ code: "CONFLICT", message: "ამ ელფოსტით ანგარიში უკვე არსებობს." });
      const user = await createPasswordUser({ name: input.name, email: input.email.trim(), normalizedEmail, passwordHash: await hashPassword(input.password) });
      ctx.res.cookie(COOKIE_NAME, await createLocalSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 7 });
      return publicUser(user);
    }),
    login: publicProcedure.input(credentialsInput).mutation(async ({ ctx, input }) => {
      const user = await getUserByNormalizedEmail(normalizeEmail(input.email));
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "ელფოსტა ან პაროლი არასწორია." });
      await updateLastSignedIn(user.id);
      ctx.res.cookie(COOKIE_NAME, await createLocalSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 7 });
      return publicUser(user);
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true,
      } as const;
    }),
  }),
  nexareply: nexareplyRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
