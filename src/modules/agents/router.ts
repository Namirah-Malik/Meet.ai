// modules/agents/router.ts - COMPLETE FILE (Drizzle ORM)

import { createTRPCRouter, baseProcedure } from '@/trpc/init';
import { db } from '@/db';
import { agents } from '@/db/schema';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

export const agentRouter = createTRPCRouter({
  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, input.id))
          .limit(1);

        if (!agent.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        return agent[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('getById error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch agent',
        });
      }
    }),

  getMany: baseProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      const agentList = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.session.user.id));

      return agentList;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('getMany error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch agents',
      });
    }
  }),

  create: baseProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Agent name is required'),
        instructions: z.string().optional().default(''),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          });
        }

        const result = await db
          .insert(agents)
          .values({
            name: input.name,
            instructions: input.instructions,
            userId: ctx.session.user.id,
          })
          .returning();

        if (!result.length) {
          throw new Error('Failed to create agent');
        }

        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('create error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create agent',
        });
      }
    }),

  update: baseProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1, 'Agent name is required'),
        instructions: z.string().optional().default(''),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          });
        }

        // Verify agent exists and belongs to user
        const existingAgent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, input.id))
          .limit(1);

        if (!existingAgent.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        if (existingAgent[0].userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not allowed to update this agent',
          });
        }

        const result = await db
          .update(agents)
          .set({
            name: input.name,
            instructions: input.instructions,
            updatedAt: new Date(),
          })
          .where(eq(agents.id, input.id))
          .returning();

        return result[0];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('update error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update agent',
        });
      }
    }),

  delete: baseProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          });
        }

        // Verify agent exists and belongs to user
        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, input.id))
          .limit(1);

        if (!agent.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        if (agent[0].userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not allowed to delete this agent',
          });
        }

        await db.delete(agents).where(eq(agents.id, input.id));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('delete error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete agent',
        });
      }
    }),
});