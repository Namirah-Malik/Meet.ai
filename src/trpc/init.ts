import { initTRPC } from '@trpc/server';
import { cache } from 'react';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * Context creation for TRPC
 * This runs on the server and extracts the user session from Better Auth
 */
export const createTRPCContext = cache(async () => {
  let session = null;
  
  try {
    // Get headers from Next.js request
    const headersList = await headers();
    
    // Get session from Better Auth using the headers
    session = await auth.api.getSession({
      headers: headersList,
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    session = null;
  }

  return {
    session,
    userId: session?.user?.id || null,
  };
});

// Initialize TRPC with context typing
const t = initTRPC.context<typeof createTRPCContext>().create();

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;