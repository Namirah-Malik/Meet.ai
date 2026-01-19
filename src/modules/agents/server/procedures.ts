import { db } from "@/db";
import { agents } from "@/db/schema";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

export const agentsRouter = createTRPCRouter({
  getMany: baseProcedure.query(async ({ ctx }) => {
    try {
      // Get the authenticated user's session
      const session = ctx.session;
      
      // Ensure user is authenticated
      if (!session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Fetch only agents belonging to the authenticated user
      const data = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, session.user.id));

      return data;
    } catch (error) {
      console.error("Get agents error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch agents",
      });
    }
  }),

  create: baseProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        instructions: z.string().min(1, "Instructions are required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the authenticated user's session
        const session = ctx.session;
        
        // Ensure user is authenticated
        if (!session?.user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        const userId = session.user.id;

        console.log("Creating agent for userId:", userId);
        console.log("Agent input:", { name: input.name, instructions: input.instructions });

        // Insert the new agent into the database
        const insertResult = await db
          .insert(agents)
          .values({
            name: input.name,
            instructions: input.instructions,
            userId: userId,
          })
          .returning();

        console.log("Agent created:", insertResult);

        if (!insertResult || insertResult.length === 0) {
          throw new Error("Failed to create agent");
        }

        return insertResult[0];
      } catch (error: any) {
        console.error("Create agent error:", error);
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create agent: ${error.message}`,
        });
      }
    }),

  delete: baseProcedure
    .input(z.string())
    .mutation(async ({ input: agentId, ctx }) => {
      try {
        // Get the authenticated user's session
        const session = ctx.session;
        
        // Ensure user is authenticated
        if (!session?.user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Verify the agent belongs to the authenticated user
        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, agentId));

        if (agent.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        if (agent[0].userId !== session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this agent",
          });
        }

        // Delete the agent
        await db.delete(agents).where(eq(agents.id, agentId));

        return { success: true };
      } catch (error: any) {
        console.error("Delete agent error:", error);
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete agent",
        });
      }
    }),
});