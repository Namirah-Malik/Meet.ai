"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, Check } from "lucide-react"
import { motion } from "framer-motion"

interface Agent {
  id: string
  name: string
  instructions: string
  userId: string
  createdAt: string
  updatedAt: string
  meetingsCount?: number
}

export const AgentDetail = () => {
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (!agentId) return
    fetchAgentDetail()
  }, [agentId])

  const fetchAgentDetail = async () => {
    try {
      setIsLoading(true)
      setIsError(false)

      const response = await fetch("/api/trpc/agents.getMany", {
        method: "GET",
      })

      const text = await response.text()
      const result = JSON.parse(text)

      let agents: Agent[] = []
      if (result.result?.data && Array.isArray(result.result.data)) {
        agents = result.result.data
      } else if (Array.isArray(result)) {
        agents = result
      }

      const foundAgent = agents.find((a: Agent) => a.id === agentId)
      if (foundAgent) {
        setAgent(foundAgent)
      } else {
        setIsError(true)
      }
    } catch (error) {
      console.error("Failed to fetch agent:", error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading agent details...</div>
      </div>
    )
  }

  if (isError || !agent) {
    return (
      <div className="w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-lg font-semibold">Agent not found</div>
        <Button
          onClick={() => router.back()}
          className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header with Back Button */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-700/50 gap-2 h-9"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white">Agent Details</h1>
        </motion.div>

        {/* Agent Details Card */}
        <motion.div
          className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Name Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">Agent Name</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white font-medium">
                {agent.name}
              </div>
              <motion.button
                onClick={() => copyToClipboard(agent.name, "name")}
                className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {copiedField === "name" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Instructions Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">Instructions</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-slate-300 font-medium max-h-40 overflow-y-auto">
                {agent.instructions}
              </div>
              <motion.button
                onClick={() => copyToClipboard(agent.instructions, "instructions")}
                className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-all h-fit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {copiedField === "instructions" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>

          {/* ID Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">Agent ID</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-slate-400 font-mono text-sm break-all">
                {agent.id}
              </div>
              <motion.button
                onClick={() => copyToClipboard(agent.id, "id")}
                className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {copiedField === "id" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Created At</label>
              <div className="text-sm text-slate-300">{formatDate(agent.createdAt)}</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Updated At</label>
              <div className="text-sm text-slate-300">{formatDate(agent.updatedAt)}</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">User ID</label>
              <div className="text-sm text-slate-300 font-mono break-all">{agent.userId}</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Interactions</label>
              <div className="text-sm text-slate-300">{agent.meetingsCount || 5} meetings</div>
            </div>
          </div>
        </motion.div>

        {/* JSON Display */}
        <motion.div
          className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Raw JSON</h2>
            <motion.button
              onClick={() => copyToClipboard(JSON.stringify(agent, null, 2), "json")}
              className="p-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-all text-xs"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copiedField === "json" ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </motion.button>
          </div>
          <pre className="bg-slate-900/50 border border-slate-600 rounded p-4 text-xs text-slate-300 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(agent, null, 2)}
          </pre>
        </motion.div>
      </div>
    </div>
  )
}