// app/agents/[id]/client.tsx

"use client"

import { useState } from "react"
import Link from "next/link"
import { Agent } from "@/modules/agents/types"
import { MoreVertical, Trash2, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AgentPageClient({ agent }: { agent: Agent }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this agent?")) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/trpc/agents.delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agent.id }),
      })

      if (response.ok) {
        window.location.href = "/agents"
      }
    } catch (error) {
      console.error("Failed to delete agent:", error)
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/agents" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
          ← Back to Agents
        </Link>

        <div className="space-y-4">
          {/* Header with agent name and dropdown */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
              <p className="text-slate-400 text-sm mt-1">My Agents  {agent.name}</p>
            </div>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-slate-700/50 rounded-lg transition">
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700">
                <DropdownMenuItem asChild>
                  <Link href={`/agents/${agent.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-400 focus:text-red-400 focus:bg-red-900/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meetings count */}
          <div className="text-slate-400 text-sm">
            📊 {agent.meetingsCount || 0} meetings
          </div>

          {/* Instructions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-slate-300 text-sm font-semibold mb-3">Instructions</h2>
            <p className="text-white whitespace-pre-wrap">{agent.instructions}</p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs mb-2">Agent ID</p>
              <p className="text-white font-mono text-xs break-all">{agent.id}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-xs mb-2">User ID</p>
              <p className="text-white font-mono text-xs break-all">{agent.userId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}