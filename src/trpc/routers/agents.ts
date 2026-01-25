import { db } from "@/db";
import { agents } from "@/db/schema";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

export const agentsRouter = createTRPCRouter({
  // =====================
  // GET ALL AGENTS
  // =====================
  getMany: baseProcedure.query(async ({ ctx }) => {
    const session = ctx.session;

    if (!session?.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    try {
      return await db
        .select()
        .from(agents)
        .where(eq(agents.userId, session.user.id));
    } catch (error) {
      console.error("Get agents error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch agents",
      });
    }
  }),

  // =====================
  // CREATE AGENT
  // =====================
  create: baseProcedure
    .input(
      z.object({
        name: z.string().min(1),
        instructions: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.session;

      if (!session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        const result = await db
          .insert(agents)
          .values({
            name: input.name,
            instructions: input.instructions,
            userId: session.user.id,
          })
          .returning();

        return result[0];
      } catch (error) {
        console.error("Create agent error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create agent",
        });
      }
    }),

  // =====================
  // UPDATE AGENT
  // =====================
  update: baseProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        instructions: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.session;

      if (!session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const existing = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id));

      if (!existing.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      if (existing[0].userId !== session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to update this agent",
        });
      }

      try {
        const updated = await db
          .update(agents)
          .set({
            name: input.name,
            instructions: input.instructions || existing[0].instructions,
            updatedAt: new Date(),
          })
          .where(eq(agents.id, input.id))
          .returning();

        return updated[0];
      } catch (error) {
        console.error("Update agent error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update agent",
        });
      }
    }),

  // =====================
  // DELETE AGENT - FIXED
  // =====================
  delete: baseProcedure
    .input(z.string())
    .mutation(async ({ input: agentId, ctx }) => {
      console.log('Delete mutation called with agent ID:', agentId);
      console.log('Session:', ctx.session);

      const session = ctx.session;

      if (!session?.user?.id) {
        console.error('No user session found');
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, agentId));

        console.log('Found agent:', agent);

        if (!agent.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        if (agent[0].userId !== session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not allowed to delete this agent",
          });
        }

        const result = await db.delete(agents).where(eq(agents.id, agentId)).returning();
        
        console.log('Delete result:', result);

        return { success: true, deleted: true };
      } catch (error) {
        console.error("Delete agent error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to delete agent",
        });
      }
    }),
});