"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { SORT_OPTIONS } from "@/constants"
import { Search, RotateCcw } from "lucide-react"
import { motion } from "framer-motion"

interface AgentFormProps {
  onSearch: (value: string) => void
  onSortChange: (value: 'newest' | 'oldest' | 'name-asc' | 'name-desc') => void
  onReset: () => void
  searchValue: string
  sortValue: string
  totalResults: number
}

export const AgentForm = ({
  onSearch,
  onSortChange,
  onReset,
  searchValue,
  sortValue,
  totalResults,
}: AgentFormProps) => {
  const [isResetting, setIsResetting] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleReset = () => {
    setIsResetting(true)
    onReset()
    setTimeout(() => setIsResetting(false), 600)
  }

  const hasActiveFilters = searchValue || sortValue !== 'newest'

  return (
    <motion.div
      className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
        {/* Search Input */}
        <motion.div 
          className="relative flex-1 min-w-48"
          animate={{ 
            scale: isSearchFocused ? 1.02 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 pointer-events-none"
            animate={{ rotate: isSearchFocused ? 360 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <Search className="w-4 h-4" />
          </motion.div>
          <Input
            type="text"
            placeholder="Filter by name"
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="pl-9 h-9 bg-slate-700/50 border border-slate-600 text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:bg-slate-700 transition-all text-sm font-medium"
          />
        </motion.div>

        {/* Results counter */}
        <motion.div 
          className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/30 text-slate-300 whitespace-nowrap"
          animate={{ 
            boxShadow: [
              '0 0 0px rgba(100, 116, 139, 0)',
              '0 0 6px rgba(100, 116, 139, 0.3)',
              '0 0 0px rgba(100, 116, 139, 0)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span>📊 {totalResults}</span>
        </motion.div>

        {/* Reset Button */}
        <motion.button
          onClick={handleReset}
          disabled={!hasActiveFilters || isResetting}
          className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg border font-semibold h-9 transition-all text-xs ${
            hasActiveFilters && !isResetting
              ? 'bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700 cursor-pointer'
              : 'bg-slate-800/30 border-slate-700 text-slate-600 cursor-not-allowed opacity-40'
          }`}
          whileHover={hasActiveFilters && !isResetting ? { scale: 1.02 } : {}}
          whileTap={hasActiveFilters && !isResetting ? { scale: 0.98 } : {}}
        >
          <motion.div
            animate={isResetting ? { rotate: 360 } : { rotate: 0 }}
            transition={{ 
              duration: isResetting ? 0.6 : 0.3,
              repeat: isResetting ? Infinity : 0,
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </motion.div>
          <span className="hidden sm:inline">Reset</span>
        </motion.button>
      </div>

      {/* Active Search Filter Badge */}
      {searchValue && (
        <motion.div
          className="mt-2 flex flex-wrap gap-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.span 
            className="inline-block bg-blue-900/40 border border-blue-700/50 text-blue-300 px-2 py-1 rounded-full text-xs font-semibold"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.05 }}
          >
            🔍 "{searchValue}"
          </motion.span>
        </motion.div>
      )}
    </motion.div>
  )
}