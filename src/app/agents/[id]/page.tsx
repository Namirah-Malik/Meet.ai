import { notFound } from 'next/navigation';
import { Agent } from '@/modules/agents/types';
import { AgentPageClient } from './client';
import { db } from '@/db';
import { agents } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface AgentPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getAgent(id: string): Promise<Agent | null> {
  try {
    const result = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return null;
  }
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { id } = await params;
  const agent = await getAgent(id);

  if (!agent) {
    notFound();
  }

  return <AgentPageClient agent={agent} />;
}