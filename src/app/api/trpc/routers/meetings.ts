import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import { db } from '@/db';
import { meetings, agents } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const meetingsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(['upcoming', 'active', 'completed', 'processing', 'cancelled']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      const whereCondition = input?.status
        ? and(
            eq(meetings.userId, ctx.session.user.id),
            eq(meetings.status, input.status)
          )
        : eq(meetings.userId, ctx.session.user.id);

      const data = await db
        .select()
        .from(meetings)
        .where(whereCondition)
        .orderBy(desc(meetings.createdAt))
        .limit(limit)
        .offset(offset);

      const meetingsWithAgents = await Promise.all(
        data.map(async (meeting) => {
          const agent = await db
            .select()
            .from(agents)
            .where(eq(agents.id, meeting.agentId))
            .limit(1);

          return {
            ...meeting,
            agent: agent[0] || null,
          };
        })
      );

      return meetingsWithAgents;
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const data = await db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.id, input),
            eq(meetings.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!data || data.length === 0) {
        throw new Error('Meeting not found');
      }

      const agent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, data[0].agentId))
        .limit(1);

      return {
        ...data[0],
        agent: agent[0] || null,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Meeting name is required'),
        agentId: z.string().min(1, 'Agent is required'),
        description: z.string().optional(),
        // Accept ANY string - no validation on format
        scheduledAt: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const agent = await db
          .select()
          .from(agents)
          .where(
            and(
              eq(agents.id, input.agentId),
              eq(agents.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!agent || agent.length === 0) {
          throw new Error('Agent not found or does not belong to you');
        }

        // Handle the date conversion safely
        let scheduledAtDate: Date | null = null;
        
        if (input.scheduledAt) {
          try {
            // If it's a string, parse it
            if (typeof input.scheduledAt === 'string' && input.scheduledAt.trim()) {
              const parsed = new Date(input.scheduledAt);
              if (!isNaN(parsed.getTime())) {
                scheduledAtDate = parsed;
              }
            }
          } catch (e) {
            console.warn('Could not parse date, setting to null');
            scheduledAtDate = null;
          }
        }

        const data = await db
          .insert(meetings)
          .values({
            name: input.name.trim(),
            userId: ctx.session.user.id,
            agentId: input.agentId,
            status: 'upcoming',
            description: input.description?.trim() || null,
            scheduledAt: scheduledAtDate,
          })
          .returning();

        if (!data || data.length === 0) {
          throw new Error('Failed to create meeting');
        }

        return {
          ...data[0],
          agent: agent[0],
        };
      } catch (error: any) {
        console.error('Error creating meeting:', error);
        throw new Error(error?.message || 'Failed to create meeting');
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        scheduledAt: z.any().optional(),
        status: z.enum(['upcoming', 'active', 'completed', 'processing', 'cancelled']).optional(),
        startedAt: z.any().optional(),
        endedAt: z.any().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      try {
        const existingMeeting = await db
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.id, id),
              eq(meetings.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found or unauthorized');
        }

        // Process dates safely
        const processedData: any = {};
        
        if (updateData.scheduledAt !== undefined) {
          if (updateData.scheduledAt) {
            try {
              const parsed = new Date(updateData.scheduledAt);
              processedData.scheduledAt = !isNaN(parsed.getTime()) ? parsed : null;
            } catch {
              processedData.scheduledAt = null;
            }
          } else {
            processedData.scheduledAt = null;
          }
        }

        if (updateData.startedAt !== undefined) {
          if (updateData.startedAt) {
            try {
              const parsed = new Date(updateData.startedAt);
              processedData.startedAt = !isNaN(parsed.getTime()) ? parsed : null;
            } catch {
              processedData.startedAt = null;
            }
          } else {
            processedData.startedAt = null;
          }
        }

        if (updateData.endedAt !== undefined) {
          if (updateData.endedAt) {
            try {
              const parsed = new Date(updateData.endedAt);
              processedData.endedAt = !isNaN(parsed.getTime()) ? parsed : null;
            } catch {
              processedData.endedAt = null;
            }
          } else {
            processedData.endedAt = null;
          }
        }
        
        if (updateData.name !== undefined) processedData.name = updateData.name;
        if (updateData.description !== undefined) processedData.description = updateData.description;
        if (updateData.status !== undefined) processedData.status = updateData.status;
        if (updateData.notes !== undefined) processedData.notes = updateData.notes;
        
        processedData.updatedAt = new Date();

        const data = await db
          .update(meetings)
          .set(processedData)
          .where(eq(meetings.id, id))
          .returning();

        if (!data || data.length === 0) {
          throw new Error('Failed to update meeting');
        }

        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, data[0].agentId))
          .limit(1);

        return {
          ...data[0],
          agent: agent[0] || null,
        };
      } catch (error: any) {
        console.error('Error updating meeting:', error);
        throw new Error(error?.message || 'Failed to update meeting');
      }
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      try {
        const existingMeeting = await db
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.id, input),
              eq(meetings.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found or unauthorized');
        }

        await db.delete(meetings).where(eq(meetings.id, input));

        return { success: true };
      } catch (error: any) {
        console.error('Error deleting meeting:', error);
        throw new Error(error?.message || 'Failed to delete meeting');
      }
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userMeetings = await db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, ctx.session.user.id));

    return {
      total: userMeetings.length,
      upcoming: userMeetings.filter((m) => m.status === 'upcoming').length,
      active: userMeetings.filter((m) => m.status === 'active').length,
      processing: userMeetings.filter((m) => m.status === 'processing').length,
      completed: userMeetings.filter((m) => m.status === 'completed').length,
      cancelled: userMeetings.filter((m) => m.status === 'cancelled').length,
    };
  }),

  startMeeting: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      try {
        const existingMeeting = await db
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.id, input),
              eq(meetings.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found');
        }

        const data = await db
          .update(meetings)
          .set({
            status: 'active',
            startedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, input))
          .returning();

        return data[0];
      } catch (error: any) {
        console.error('Error starting meeting:', error);
        throw new Error(error?.message || 'Failed to start meeting');
      }
    }),

  endMeeting: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existingMeeting = await db
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.id, input.id),
              eq(meetings.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found');
        }

        const data = await db
          .update(meetings)
          .set({
            status: 'completed',
            endedAt: new Date(),
            notes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, input.id))
          .returning();

        return data[0];
      } catch (error: any) {
        console.error('Error ending meeting:', error);
        throw new Error(error?.message || 'Failed to end meeting');
      }
    }),

  cancelMeeting: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      try {
        const existingMeeting = await db
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.id, input),
              eq(meetings.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found');
        }

        const data = await db
          .update(meetings)
          .set({
            status: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, input))
          .returning();

        return data[0];
      } catch (error: any) {
        console.error('Error cancelling meeting:', error);
        throw new Error(error?.message || 'Failed to cancel meeting');
      }
    }),
});