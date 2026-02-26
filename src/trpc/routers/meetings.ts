import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import { db } from '@/db';
import { meetings, agents } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { StreamClient } from '@stream-io/node-sdk';
import { TRPCError } from '@trpc/server';
import { inngest } from '@/inngest/client';

// Initialize Stream client
const streamClient = new StreamClient(
  process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY || '',
  process.env.STREAM_VIDEO_SECRET_KEY || ''
);

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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
      }

      const agent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, data[0].agentId))
        .limit(1);

      return {
        ...data[0],
        agent: agent[0] || null,
        // summary, transcriptUrl, recordingUrl are included via spread
      };
    }),

  // ── New: get stored transcript for a completed meeting ──────────────────────
  getTranscript: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: meetingId }) => {
      const [meeting] = await db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.id, meetingId),
            eq(meetings.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!meeting) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' });
      }

      // Transcript is stored as JSON in the notes field
      // Once you add a dedicated transcriptData column, read from there instead
      if (!meeting.notes) {
        return { transcript: [], source: 'none' as const };
      }

      try {
        const parsed = JSON.parse(meeting.notes);
        if (Array.isArray(parsed)) {
          return { transcript: parsed, source: 'stored' as const };
        }
      } catch {
        // notes contains plain text (old meetings) — not a transcript
      }

      return { transcript: [], source: 'none' as const };
    }),
  // ────────────────────────────────────────────────────────────────────────────

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Meeting name is required'),
        agentId: z.string().min(1, 'Agent is required'),
        description: z.string().optional(),
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

        let scheduledAtDate: Date | null = null;
        if (input.scheduledAt) {
          try {
            if (typeof input.scheduledAt === 'string' && input.scheduledAt.trim()) {
              const parsed = new Date(input.scheduledAt);
              if (!isNaN(parsed.getTime())) scheduledAtDate = parsed;
            }
          } catch {
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

        if (!data || data.length === 0) throw new Error('Failed to create meeting');

        return { ...data[0], agent: agent[0] };
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
          .where(and(eq(meetings.id, id), eq(meetings.userId, ctx.session.user.id)))
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found or unauthorized');
        }

        const processedData: any = {};

        if (updateData.scheduledAt !== undefined) {
          try {
            const parsed = new Date(updateData.scheduledAt);
            processedData.scheduledAt = !isNaN(parsed.getTime()) ? parsed : null;
          } catch { processedData.scheduledAt = null; }
        }
        if (updateData.startedAt !== undefined) {
          try {
            const parsed = new Date(updateData.startedAt);
            processedData.startedAt = !isNaN(parsed.getTime()) ? parsed : null;
          } catch { processedData.startedAt = null; }
        }
        if (updateData.endedAt !== undefined) {
          try {
            const parsed = new Date(updateData.endedAt);
            processedData.endedAt = !isNaN(parsed.getTime()) ? parsed : null;
          } catch { processedData.endedAt = null; }
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

        if (!data || data.length === 0) throw new Error('Failed to update meeting');

        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, data[0].agentId))
          .limit(1);

        return { ...data[0], agent: agent[0] || null };
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
          .where(and(eq(meetings.id, input), eq(meetings.userId, ctx.session.user.id)))
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
          .where(and(eq(meetings.id, input), eq(meetings.userId, ctx.session.user.id)))
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found');
        }

        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, existingMeeting[0].agentId))
          .limit(1);

        if (!agent || agent.length === 0) throw new Error('Agent not found');

        try {
          const call = streamClient.call('default', input);
          await call.getOrCreate({
            data: {
              custom: {
                meetingId: input,
                agentId: existingMeeting[0].agentId,
                agentName: agent[0].name,
                instructions: agent[0].instructions,
              },
              title: existingMeeting[0].name,
            },
          });
          console.log('Stream call created:', input);
        } catch (streamError) {
          console.warn('Stream call creation warning:', streamError);
        }

        const data = await db
          .update(meetings)
          .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
          .where(eq(meetings.id, input))
          .returning();

        return data[0];
      } catch (error: any) {
        console.error('Error starting meeting:', error);
        throw new Error(error?.message || 'Failed to start meeting');
      }
    }),

  // ── Updated: endMeeting now triggers Inngest processing ─────────────────────
  endMeeting: protectedProcedure
    .input(z.object({ id: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existingMeeting = await db
          .select()
          .from(meetings)
          .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.session.user.id)))
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found');
        }

        // Get transcript URL from Stream before ending the call
        let transcriptUrl: string | null = null;
        try {
          const call = streamClient.call('default', input.id);
          
          // End the Stream call
          await call.endCall();
          console.log('Stream call ended:', input.id);

          // Try to get the transcript URL from Stream's recordings/transcripts
          // Stream provides this after processing — may not be instant
          const callData = await call.get();
          const transcripts = (callData.call as any)?.transcription?.closed_captions_files;
          if (transcripts && transcripts.length > 0) {
            transcriptUrl = transcripts[0].url;
          }
        } catch (streamError) {
          console.warn('Stream call end warning:', streamError);
        }

        // Set status to 'processing' if we have a transcript URL, otherwise 'completed'
        const newStatus = transcriptUrl ? 'processing' : 'completed';

        const data = await db
          .update(meetings)
          .set({
            status: newStatus,
            endedAt: new Date(),
            notes: input.notes || null,
            ...(transcriptUrl ? { transcriptUrl } : {}),
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, input.id))
          .returning();

        // Fire Inngest job if we have a transcript to process
        if (transcriptUrl) {
          await inngest.send({
            name: 'meetings/processing',
            data: {
              meetingId: input.id,
              transcriptUrl,
            },
          });
          console.log('Inngest job fired for meeting:', input.id);
        }

        return data[0];
      } catch (error: any) {
        console.error('Error ending meeting:', error);
        throw new Error(error?.message || 'Failed to end meeting');
      }
    }),
  // ────────────────────────────────────────────────────────────────────────────

  cancelMeeting: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      try {
        const existingMeeting = await db
          .select()
          .from(meetings)
          .where(and(eq(meetings.id, input), eq(meetings.userId, ctx.session.user.id)))
          .limit(1);

        if (!existingMeeting || existingMeeting.length === 0) {
          throw new Error('Meeting not found');
        }

        try {
          const call = streamClient.call('default', input);
          await call.endCall();
          console.log('Stream call cancelled:', input);
        } catch (streamError) {
          console.warn('Stream call cancel warning:', streamError);
        }

        const data = await db
          .update(meetings)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(meetings.id, input))
          .returning();

        return data[0];
      } catch (error: any) {
        console.error('Error cancelling meeting:', error);
        throw new Error(error?.message || 'Failed to cancel meeting');
      }
    }),
});