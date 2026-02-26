import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings, agents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Verify webhook signature manually
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

    // Verify signature
    if (!signature || !verifySignature(body, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ status: 'ok' }); // Still return ok to not spam Stream
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

    // Handle call.session_started - Agent should join
    if (eventType === 'call.session_started') {
      const event = payload as any;
      const callId = event.call?.id;
      const meetingId = event.call?.cid?.split(':')[1]; // Extract from call id
      const customData = event.call?.custom || {};

      console.log('Session started:', {
        callId,
        meetingId,
        customData,
      });

      if (!meetingId) {
        console.warn('No meetingId in webhook event');
        return NextResponse.json({ status: 'ok' });
      }

      try {
        // Update meeting to active
        await db
          .update(meetings)
          .set({
            status: 'active',
            startedAt: new Date(),
          })
          .where(eq(meetings.id, meetingId));

        console.log('Meeting activated:', meetingId);

        // Get meeting and agent details
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

        console.log('Agent found:', {
          agentId: agentData.id,
          agentName: agentData.name,
          instructions: agentData.instructions?.substring(0, 50),
        });

        // Here's where the agent would be connected
        // This is handled via OpenAI Realtime API directly
        // The agent connection happens on the client side in the meeting detail page

        return NextResponse.json({
          status: 'ok',
          message: 'Meeting activated successfully',
          data: {
            meetingId,
            agentId: agentData.id,
            agentName: agentData.name,
          },
        });
      } catch (error) {
        console.error('Error handling session_started:', error);
        return NextResponse.json({ status: 'ok' });
      }
    }

    // Handle call.session_ended
    if (eventType === 'call.session_ended') {
      const event = payload as any;
      const meetingId = event.call?.cid?.split(':')[1];

      console.log('Session ended:', meetingId);

      if (meetingId) {
        try {
          await db
            .update(meetings)
            .set({
              status: 'completed',
              endedAt: new Date(),
            })
            .where(
              and(
                eq(meetings.id, meetingId),
                eq(meetings.status, 'active')
              )
            );

          console.log('Meeting completed:', meetingId);
        } catch (error) {
          console.error('Error completing meeting:', error);
        }
      }

      return NextResponse.json({ status: 'ok' });
    }

    // Handle call.session_participant_joined
    if (eventType === 'call.session_participant_joined') {
      const event = payload as any;
      const participant = event.participant;
      const meetingId = event.call?.cid?.split(':')[1];

      console.log('Participant joined:', {
        userId: participant?.user_id,
        name: participant?.name,
        meetingId,
      });

      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'ok' });
  }
}