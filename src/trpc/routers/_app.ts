//import { agentsRouter } from "@/modules/agents/server/procedures";
//import { createTRPCRouter } from "../init";

//export const appRouter = createTRPCRouter({
  //agents: agentsRouter,
//});

//export type AppRouter = typeof appRouter;//
// server/routers/_app.ts

// server/routers/_app.ts

// src/trpc/routers/_app.ts
import { createTRPCRouter } from "@/trpc/init";
import { meetingsRouter } from "@/app/api/trpc/routers/meetings";
import { agentsRouter } from "./agents";

export const appRouter = createTRPCRouter({
  meetings: meetingsRouter,
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;