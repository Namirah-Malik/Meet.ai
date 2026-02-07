import { NextRequest, NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_VIDEO_SECRET_KEY;

export async function POST(req: NextRequest) {
  try {
    const { userId, userName } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      console.error('Stream credentials missing:', {
        hasApiKey: !!STREAM_API_KEY,
        hasSecret: !!STREAM_API_SECRET,
      });
      return NextResponse.json(
        { error: 'Stream credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize Stream client with your credentials
    const client = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);

    // Generate token (valid for 24 hours)
    const token = client.generateUserToken({
      user_id: userId,
      duration: 86400,
    });

    return NextResponse.json(
      { token },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating Stream token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: String(error) },
      { status: 500 }
    );
  }
}