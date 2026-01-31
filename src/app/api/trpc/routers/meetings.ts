import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const meetingStatusEnum = z.enum([
  "upcoming",
  "active",
  "completed",
  "processing",
  "cancelled",
]);

export const meetingsRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 10;
      const offset = input?.offset || 0;

      const data = await db
        .select()
        .from(meetings)
        .where(eq(meetings.userId, ctx.userId))
        .limit(limit)
        .offset(offset);

      return data;
    }),

  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 10;
      const offset = input?.offset || 0;

      const data = await db
        .select()
        .from(meetings)
        .where(eq(meetings.userId, ctx.userId))
        .limit(limit)
        .offset(offset);

      return data;
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
            eq(meetings.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!data || data.length === 0) {
        throw new Error("Meeting not found");
      }

      return data[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        agentId: z.string(),
        description: z.string().optional(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = await db
        .insert(meetings)
        .values({
          name: input.name,
          userId: ctx.userId,
          agentId: input.agentId,
          description: input.description,
          scheduledAt: input.scheduledAt,
          status: "upcoming",
        })
        .returning();

      return data[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: meetingStatusEnum.optional(),
        notes: z.string().optional(),
        scheduledAt: z.date().optional(),
        startedAt: z.date().optional(),
        endedAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const data = await db
        .update(meetings)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(meetings.id, id),
            eq(meetings.userId, ctx.userId)
          )
        )
        .returning();

      if (!data || data.length === 0) {
        throw new Error("Meeting not found or unauthorized");
      }

      return data[0];
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const data = await db
        .delete(meetings)
        .where(
          and(
            eq(meetings.id, input),
            eq(meetings.userId, ctx.userId)
          )
        )
        .returning();

      if (!data || data.length === 0) {
        throw new Error("Meeting not found or unauthorized");
      }

      return { success: true };
    }),
});