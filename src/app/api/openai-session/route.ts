import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { instructions, agentName } = await req.json();

    const systemPrompt = instructions ||
      `You are ${agentName || 'a helpful AI assistant'}. Be conversational and helpful.`;

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
        modalities: ['audio', 'text'],
        instructions: systemPrompt,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI session error:', error);
      return NextResponse.json(
        { error: 'Failed to create OpenAI session', detail: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Session created:', data.id, 'voice:', data.voice, 'modalities:', data.modalities);
    
    return NextResponse.json({
      clientSecret: data.client_secret.value,
      sessionId: data.id,
    });
  } catch (error: any) {
    console.error('Session route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}