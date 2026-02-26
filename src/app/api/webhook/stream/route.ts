import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings, agents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import crypto from 'crypto';

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.STREAM_VIDEO_SECRET_KEY || '';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-signature');
    const body = await req.text();

    console.log('Webhook received:', {
      signature: signature ? 'present' : 'missing',
      bodyLength: body.length,
    });

    if (!signature || !verifySignature(body, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ status: 'ok' });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse webhook body:', e);
      return NextResponse.json({ status: 'ok' });
    }

    const eventType = payload.type as string;
    console.log('Webhook event:', eventType);

    // ── call.session_started ──────────────────────────────────────────────────
    if (eventType === 'call.session_started') {
      const event = payload as any;
      const meetingId = event.call?.cid?.split(':')[1];
      const customData = event.call?.custom || {};

      console.log('Session started:', { meetingId, customData });

      if (!meetingId) {
        console.warn('No meetingId in webhook event');
        return NextResponse.json({ status: 'ok' });
      }

      try {
        await db
          .update(meetings)
          .set({ status: 'active', startedAt: new Date() })
          .where(eq(meetings.id, meetingId));

        const [meetingData] = await db
          .select()
          .from(meetings)
          .where(eq(meetings.id, meetingId));

        if (!meetingData) {
          console.warn('Meeting not found:', meetingId);
          return NextResponse.json({ status: 'ok' });
        }

        const [agentData] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, meetingData.agentId));

        if (!agentData) {
          console.warn('Agent not found for meeting:', meetingId);
          return NextResponse.json({ status: 'ok' });
        }

        console.log('Meeting activated:', meetingId, '| Agent:', agentData.name);

        return NextResponse.json({
          status: 'ok',
          data: { meetingId, agentId: agentData.id, agentName: agentData.name },
        });
      } catch (error) {
        console.error('Error handling session_started:', error);
        return NextResponse.json({ status: 'ok' });
      }
    }

    // ── call.session_ended ────────────────────────────────────────────────────
    if (eventType === 'call.session_ended') {
      const event = payload as any;
      const meetingId = event.call?.cid?.split(':')[1];

      console.log('Session ended:', meetingId);

      if (!meetingId) return NextResponse.json({ status: 'ok' });

      try {
        // Extract transcript URL from the Stream event payload
        // Stream puts it in egress/transcription data after the call ends
        const transcriptUrl: string | null =
          event.call?.transcription?.closed_captions_files?.[0]?.url ??
          event.call?.egress?.transcriptions?.[0]?.url ??
          null;

        console.log('Transcript URL from webhook:', transcriptUrl ?? 'not available yet');

        if (transcriptUrl) {
          // We have a transcript — set to processing and fire Inngest
          await db
            .update(meetings)
            .set({
              status: 'processing',
              endedAt: new Date(),
              transcriptUrl,
            })
            .where(
              and(
                eq(meetings.id, meetingId),
                eq(meetings.status, 'active')
              )
            );

          await inngest.send({
            name: 'meetings/processing',
            data: { meetingId, transcriptUrl },
          });

          console.log('Inngest job fired for meeting:', meetingId);
        } else {
          // No transcript available — mark directly as completed
          await db
            .update(meetings)
            .set({ status: 'completed', endedAt: new Date() })
            .where(
              and(
                eq(meetings.id, meetingId),
                eq(meetings.status, 'active')
              )
            );

          console.log('Meeting completed (no transcript):', meetingId);
        }
      } catch (error) {
        console.error('Error handling session_ended:', error);
      }

      return NextResponse.json({ status: 'ok' });
    }

    // ── call.transcription_ready ──────────────────────────────────────────────
    // Stream fires this event when the transcript file is ready (sometimes delayed)
    if (eventType === 'call.transcription_ready') {
      const event = payload as any;
      const meetingId = event.call_cid?.split(':')[1];
      const transcriptUrl: string | null =
        event.transcription?.url ?? null;

      console.log('Transcription ready:', { meetingId, transcriptUrl });

      if (meetingId && transcriptUrl) {
        try {
          const [meeting] = await db
            .select()
            .from(meetings)
            .where(eq(meetings.id, meetingId));

          // Only process if not already done
          if (meeting && meeting.status !== 'completed' && !meeting.summary) {
            await db
              .update(meetings)
              .set({ status: 'processing', transcriptUrl })
              .where(eq(meetings.id, meetingId));

            await inngest.send({
              name: 'meetings/processing',
              data: { meetingId, transcriptUrl },
            });

            console.log('Inngest job fired (transcription_ready):', meetingId);
          }
        } catch (error) {
          console.error('Error handling transcription_ready:', error);
        }
      }

      return NextResponse.json({ status: 'ok' });
    }

    // ── call.session_participant_joined ───────────────────────────────────────
    if (eventType === 'call.session_participant_joined') {
      const event = payload as any;
      console.log('Participant joined:', {
        userId: event.participant?.user_id,
        name: event.participant?.name,
        meetingId: event.call?.cid?.split(':')[1],
      });
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'ok' });
  }
}