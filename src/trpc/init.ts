import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { headers } from "next/headers";

/**
 * Context creation for tRPC with Better Auth integration
 */
export const createTRPCContext = cache(async () => {
  let session = null;
  let userId: string | null = null;

  try {
    const { auth } = await import("@/lib/auth");
    const headersList = await headers();

    session = await auth.api.getSession({
      headers: headersList,
    });

    userId = session?.user?.id || null;
  } catch (error) {
    console.error("Failed to get Better Auth session:", error);
    userId = null;
  }

  return {
    session,
    userId,
  };
});

// Initialize tRPC with context typing
const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    isServer: true,
    allowOutsideOfServer: true,
  });

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      session: ctx.session,
    },
  });
});

// Public procedure - no authentication required
export const baseProcedure = t.procedure;