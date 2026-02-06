import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { db } from '@/db';
import { agents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const agentsRouter = createTRPCRouter({
  // List all agents for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.query.agents.findMany({
      where: eq(agents.userId, ctx.session.user.id),
      orderBy: desc(agents.createdAt),
    });
  }),

  // Get single agent by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });

      if (!agent || agent.userId !== ctx.session.user.id) {
        throw new Error('Agent not found');
      }

      return agent;
    }),

  // Create new agent
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Agent name is required'),
        instructions: z.string().min(1, 'Instructions are required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newAgent = await db
        .insert(agents)
        .values({
          name: input.name,
          instructions: input.instructions,
          userId: ctx.session.user.id,
        })
        .returning();

      return newAgent[0];
    }),

  // Update agent
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        instructions: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify agent belongs to user
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, id),
      });

      if (!agent || agent.userId !== ctx.session.user.id) {
        throw new Error('Agent not found');
      }

      const updatedAgent = await db
        .update(agents)
        .set(updateData)
        .where(eq(agents.id, id))
        .returning();

      return updatedAgent[0];
    }),

  // Delete agent
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });

      if (!agent || agent.userId !== ctx.session.user.id) {
        throw new Error('Agent not found');
      }

      await db.delete(agents).where(eq(agents.id, input.id));

      return { success: true };
    }),
});