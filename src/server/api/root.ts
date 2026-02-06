// FILE: src/server/api/root.ts
// INSTRUCTIONS: Add these imports and update the appRouter

// ===== ADD THESE IMPORTS AT THE TOP =====
import { meetingsRouter } from "./routers/meeting";
import { agentsRouter } from "./routers/agents";
// Add to your existing imports

// ===== UPDATE YOUR appRouter =====
// Find your existing appRouter creation and ADD these lines:

export const appRouter = createCallerFactory(t)({
  // ADD THESE TWO LINES:
  meetings: meetingsRouter,
  agents: agentsRouter,
  
  // Keep your existing routers...
  // example: posts: postRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;