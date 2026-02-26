import { NextRequest, NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const apiSecret = process.env.STREAM_VIDEO_SECRET_KEY;

if (!apiKey || !apiSecret) {
  throw new Error('Stream.io API keys not configured');
}

const streamClient = new StreamClient(apiKey, apiSecret);

export async function POST(req: NextRequest) {
  try {
    const { userId, userName } = await req.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { error: 'userId and userName are required' },
        { status: 400 }
      );
    }

    // Create token valid for 24 hours
    const token = streamClient.createToken(userId, Math.floor(Date.now() / 1000) + 86400);

    return NextResponse.json({
      token,
      apiKey,
      userId,
      userName,
    });
  } catch (error: any) {
    console.error('Error creating Stream token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create token' },
      { status: 500 }
    );
  }
}