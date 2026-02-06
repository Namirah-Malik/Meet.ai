import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { db } from '@/db';
import { meetings,agents } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const meetingsRouter = createTRPCRouter({
  // List all meetings for current user with optional status filter
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['upcoming', 'active', 'completed', 'processing', 'cancelled']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const query = db.query.meetings.findMany({
        where: input?.status
          ? and(
              eq(meetings.userId, ctx.session.user.id),
              eq(meetings.status, input.status)
            )
          : eq(meetings.userId, ctx.session.user.id),
        with: {
          agent: true,
        },
        orderBy: desc(meetings.createdAt),
      });

      return query;
    }),

  // Get single meeting by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const meeting = await db.query.meetings.findFirst({
        where: and(
          eq(meetings.id, input.id),
          eq(meetings.userId, ctx.session.user.id)
        ),
        with: {
          agent: true,
        },
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      return meeting;
    }),

  // Create new meeting
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Meeting name is required'),
        agentId: z.string().min(1, 'Agent is required'),
        scheduledAt: z.date().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify agent belongs to user
      const agent = await db.query.agents.findFirst({
        where: and(
          eq(agents.id, input.agentId),
          eq(agents.userId, ctx.session.user.id)
        ),
      });

      if (!agent) {
        throw new Error('Agent not found or does not belong to you');
      }

      const newMeeting = await db
        .insert(meetings)
        .values({
          name: input.name,
          agentId: input.agentId,
          userId: ctx.session.user.id,
          scheduledAt: input.scheduledAt,
          description: input.description,
          status: 'upcoming',
        })
        .returning();

      return newMeeting[0];
    }),

  // Update meeting
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        scheduledAt: z.date().optional(),
        status: z.enum(['upcoming', 'active', 'completed', 'processing', 'cancelled']).optional(),
        startedAt: z.date().optional(),
        endedAt: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify meeting belongs to user
      const meeting = await db.query.meetings.findFirst({
        where: and(
          eq(meetings.id, id),
          eq(meetings.userId, ctx.session.user.id)
        ),
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const updatedMeeting = await db
        .update(meetings)
        .set(updateData)
        .where(eq(meetings.id, id))
        .returning();

      return updatedMeeting[0];
    }),

  // Delete meeting
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify meeting belongs to user
      const meeting = await db.query.meetings.findFirst({
        where: and(
          eq(meetings.id, input.id),
          eq(meetings.userId, ctx.session.user.id)
        ),
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      await db.delete(meetings).where(eq(meetings.id, input.id));

      return { success: true };
    }),

  // Get meeting statistics for dashboard
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userMeetings = await db.query.meetings.findMany({
      where: eq(meetings.userId, ctx.session.user.id),
    });

    return {
      total: userMeetings.length,
      upcoming: userMeetings.filter((m) => m.status === 'upcoming').length,
      active: userMeetings.filter((m) => m.status === 'active').length,
      processing: userMeetings.filter((m) => m.status === 'processing').length,
      completed: userMeetings.filter((m) => m.status === 'completed').length,
      cancelled: userMeetings.filter((m) => m.status === 'cancelled').length,
    };
  }),

  // Start a meeting (change status to active)
  startMeeting: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await db.query.meetings.findFirst({
        where: and(
          eq(meetings.id, input.id),
          eq(meetings.userId, ctx.session.user.id)
        ),
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const updatedMeeting = await db
        .update(meetings)
        .set({
          status: 'active',
          startedAt: new Date(),
        })
        .where(eq(meetings.id, input.id))
        .returning();

      return updatedMeeting[0];
    }),

  // End a meeting (change status to completed)
  endMeeting: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await db.query.meetings.findFirst({
        where: and(
          eq(meetings.id, input.id),
          eq(meetings.userId, ctx.session.user.id)
        ),
      });

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const updatedMeeting = await db
        .update(meetings)
        .set({
          status: 'completed',
          endedAt: new Date(),
          notes: input.notes,
        })
        .where(eq(meetings.id, input.id))
        .returning();

      return updatedMeeting[0];
    }),
});