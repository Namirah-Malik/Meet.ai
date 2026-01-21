"use client"

import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Agent } from "@/modules/agents/types"
import { motion } from "framer-motion"

const getAvatarUrl = (id: string) => {
  const avatarStyles = [
    "bottts",
    "bottts-neutral",
    "lorelei",
  ]
  
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  const style = avatarStyles[hash % avatarStyles.length]
  
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(id)}&scale=85&backgroundColor=random`
}

const getGradientColor = (id: string) => {
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-red-500",
    "from-indigo-500 to-purple-500",
    "from-pink-500 to-rose-500",
    "from-cyan-500 to-blue-500",
    "from-yellow-500 to-orange-500",
  ]
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return gradients[hash % gradients.length]
}

const AgentNameCell = ({ agent }: { agent: Agent }) => {
  const router = useRouter()
  const avatarUrl = getAvatarUrl(agent.id)
  const gradient = getGradientColor(agent.id)
  
  const handleClick = () => {
    router.push(`/agents/${agent.id}`)
  }

  return (
    <motion.button
      onClick={handleClick}
      className="w-full text-left group"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 py-2">
        {/* Avatar */}
        <div className="relative flex-shrink-0 group/avatar">
          <motion.div
            className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-full blur-md opacity-60 group-hover/avatar:opacity-100 transition-all duration-300`}
          ></motion.div>
          
          <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${gradient} p-1 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white overflow-hidden`}>
            <img
              src={avatarUrl}
              alt={agent.name}
              className="w-full h-full rounded-full object-cover bg-white group-hover/avatar:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(agent.id)}&scale=85`
              }}
            />
          </div>
          
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg border-2 border-white">
            ⚡
          </div>
          
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-md animate-pulse"></div>
        </div>
        
        {/* Text Content */}
        <div className="flex flex-col gap-1 flex-1 min-w-0 group-hover:translate-x-1 transition-transform duration-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
              {agent.name}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full font-semibold group-hover:from-purple-100 group-hover:to-pink-100 group-hover:text-purple-700 transition-all duration-300">
              AI Agent
            </span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-1 group-hover:text-cyan-600 transition-colors duration-300">
            {agent.instructions}
          </p>
        </div>
      </div>
    </motion.button>
  )
}

export const columns: ColumnDef<Agent>[] = [
  {
    accessorKey: "name",
    header: "Agent Name",
    cell: ({ row }) => <AgentNameCell agent={row.original} />,
  },
  {
    accessorKey: "createdAt",
    header: "Deployed",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string | Date
      const formattedDate = new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      })
      return (
        <div className="text-xs font-semibold text-slate-400">
          {formattedDate}
        </div>
      )
    },
  },
  {
    accessorKey: "meetingsCount",
    header: "Interactions",
    cell: ({ row }) => {
      const count = row.getValue("meetingsCount") as number | undefined
      return (
        <div className="flex items-center justify-end gap-2 pr-2">
          <span className="text-xs font-bold text-slate-300">⚡ {count || 0}</span>
          <span className="text-xs text-green-400 font-semibold">active</span>
        </div>
      )
    },
  },
]