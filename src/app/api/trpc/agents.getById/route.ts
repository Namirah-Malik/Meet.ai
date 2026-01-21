// app/api/trpc/agents.getById/route.ts

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { agents } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      )
    }

    // Fetch agent from database
    const agentData = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1)

    if (!agentData || agentData.length === 0) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    const agent = {
      ...agentData[0],
      meetingsCount: 5, // You can calculate this from meetings table if needed
    }

    return NextResponse.json({
      result: {
        data: agent,
      },
    })
  } catch (error) {
    console.error("Failed to fetch agent:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    )
  }
}