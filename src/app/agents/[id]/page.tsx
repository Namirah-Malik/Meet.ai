// app/agents/[id]/page.tsx

import { notFound } from "next/navigation"
import Link from "next/link"
import { Agent } from "@/modules/agents/types"
import { AgentPageClient } from "./client"

interface AgentPageProps {
  params: {
    id: string
  }
}

async function getAgent(id: string): Promise<Agent | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/trpc/agents.getById?id=${id}`,
      { cache: "no-store" }
    )

    if (!response.ok) return null

    const text = await response.text()
    const result = JSON.parse(text)

    return result.result?.data || result[0] || result
  } catch (error) {
    console.error("Failed to fetch agent:", error)
    return null
  }
}

export default async function AgentPage({ params }: AgentPageProps) {
  const agent = await getAgent(params.id)

  if (!agent) {
    notFound()
  }

  return <AgentPageClient agent={agent} />
}