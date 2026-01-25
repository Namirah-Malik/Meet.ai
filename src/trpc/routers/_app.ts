//import { agentsRouter } from "@/modules/agents/server/procedures";
//import { createTRPCRouter } from "../init";

//export const appRouter = createTRPCRouter({
  //agents: agentsRouter,
//});

//export type AppRouter = typeof appRouter;//
// server/routers/_app.ts

// server/routers/_app.ts

import { createTRPCRouter } from "@/trpc/init";
import { agentsRouter } from "@/trpc/routers/agents";
 // Update this path to match your file location

export const appRouter = createTRPCRouter({
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;