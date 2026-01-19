"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Agent } from "@/modules/agents/types"

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

export const columns: ColumnDef<Agent>[] = [
  {
    accessorKey: "name",
    header: "Agent Name",
    cell: ({ row }) => {
      const agent = row.original
      const avatarUrl = getAvatarUrl(agent.id)
      const gradient = getGradientColor(agent.id)
      
      return (
        <div className="flex items-center gap-4 py-3 group/row">
          {/* AI Agent Avatar with glow effect */}
          <div className="relative flex-shrink-0 group">
            {/* Glow background - enhanced on hover */}
            <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-full blur-md opacity-60 group-hover:opacity-100 transition-all duration-300 animate-pulse group-hover:blur-lg group-hover:scale-125`}></div>
            
            {/* Avatar container */}
            <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${gradient} p-1 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 cursor-pointer border-2 border-white overflow-hidden group-hover:-rotate-6`}>
              <img
                src={avatarUrl}
                alt={agent.name}
                className="w-full h-full rounded-full object-cover bg-white group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(agent.id)}&scale=85`
                }}
              />
            </div>
            
            {/* AI Badge - animated on hover */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg border-2 border-white group-hover:animate-bounce group-hover:scale-125 transition-transform duration-300">
              ⚡
            </div>
            
            {/* Status dot - enhanced pulse on hover */}
            <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-md animate-pulse group-hover:shadow-green-400 group-hover:shadow-lg"></div>
          </div>
          
          {/* Text content - animated on hover */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 group-hover/row:translate-x-1 transition-transform duration-300">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover/row:from-purple-600 group-hover/row:to-pink-600 transition-all duration-300">
                {agent.name}
              </span>
              <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full font-semibold group-hover/row:from-purple-100 group-hover/row:to-pink-100 group-hover/row:text-purple-700 transition-all duration-300 group-hover/row:scale-110 group-hover/row:shadow-lg">
                AI Agent
              </span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2 group-hover/row:text-cyan-600 transition-colors duration-300 font-medium">
              {agent.instructions}
            </p>
          </div>
        </div>
      )
    },
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
        <div className="text-sm font-semibold bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent hover:from-blue-600 hover:to-cyan-600 transition-all duration-300">
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
        <div className="flex items-center justify-end gap-3 pr-4 group/badge">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 rounded-full border border-blue-200 hover:border-blue-400 transition-all duration-300 shadow-sm group-hover/badge:shadow-lg group-hover/badge:from-purple-50 group-hover/badge:to-pink-50 group-hover/badge:scale-110">
            <span className="text-lg group-hover/badge:animate-spin" style={{animationDuration: "1s"}}>⚡</span>
            <span className="font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent min-w-8 text-center group-hover/badge:from-purple-700 group-hover/badge:to-pink-700 transition-all duration-300">
              {count || 0}
            </span>
            <span className="text-xs bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold group-hover/badge:from-purple-600 group-hover/badge:to-pink-600 transition-all duration-300">
              active
            </span>
          </div>
        </div>
      )
    },
  },
]