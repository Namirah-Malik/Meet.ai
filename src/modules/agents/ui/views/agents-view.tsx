"use client"

import { useState, useEffect } from "react"
import { DataTable } from "../components/data-table"
import { columns } from "../components/columns"
import { EmptyState } from "@/components/empty-state"
import { AgentForm } from "../components/agent-form"
import { Agent } from "@/modules/agents/types"
import { useAgentsFilters } from "@/modules/agents/hooks/use-agents-filters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { motion } from "framer-motion"

export const AgentsView = () => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [instructions, setInstructions] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [key, setKey] = useState(0)

  const {
    filters,
    paginationInfo,
    paginatedAgents,
    filteredAgents,
    setSearch,
    setSortBy,
    setPage,
    nextPage,
    previousPage,
    resetFilters,
  } = useAgentsFilters(agents)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setIsLoading(true)
      setIsError(false)
      
      const response = await fetch("/api/trpc/agents.getMany", {
        method: "GET",
      })

      const text = await response.text()
      const result = JSON.parse(text)
      
      if (result.result?.data && Array.isArray(result.result.data)) {
        const transformedAgents = result.result.data.map((agent: any) => ({
          ...agent,
          meetingsCount: 5,
        }))
        setAgents(transformedAgents)
      } else if (Array.isArray(result)) {
        const transformedAgents = result.map((agent: any) => ({
          ...agent,
          meetingsCount: 5,
        }))
        setAgents(transformedAgents)
      } else {
        setIsError(true)
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !instructions.trim()) {
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/trpc/agents.create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          instructions: instructions.trim(),
        }),
      })

      const text = await response.text()
      const result = JSON.parse(text)

      if (response.ok) {
        await fetchAgents()
        setName("")
        setInstructions("")
        setOpen(false)
        setKey(prev => prev + 1)
      } else {
        console.error("Failed to create agent:", result)
      }
    } catch (error) {
      console.error("Failed to create agent:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleResetFilters = () => {
    resetFilters()
    setKey(prev => prev + 1)
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h3 className="text-lg font-semibold text-red-600">Error loading agents</h3>
        <p className="text-sm text-gray-500">Please try again later</p>
      </div>
    )
  }

  const allAgentsEmpty = agents.length === 0 && !isLoading
  const noResultsAfterFilter = filteredAgents.length === 0 && agents.length > 0 && !isLoading

  return (
    <div className="w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 min-h-screen flex flex-col">
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-white">My Agents</h1>
            <p className="text-slate-400 text-sm mt-1">
              {allAgentsEmpty ? "Create your first agent" : `${paginationInfo.totalItems} agent${paginationInfo.totalItems !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button className="bg-green-500 hover:bg-green-600 text-white gap-2 font-semibold px-4 py-1 h-9 text-sm">
                  <Plus className="h-4 w-4" />
                  New Agent
                </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">Create New Agent</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Add a new agent to your workspace
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAgent} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200 font-semibold text-sm">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter agent name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isCreating}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 text-sm h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions" className="text-slate-200 font-semibold text-sm">Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Enter agent instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    disabled={isCreating}
                    required
                    rows={3}
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isCreating}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-sm h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white text-sm h-9"
                    disabled={isCreating || !name.trim() || !instructions.trim()}
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Show empty state when no agents */}
        {allAgentsEmpty ? (
          <EmptyState onCreateClick={() => setOpen(true)} />
        ) : (
          <>
            {/* Filter Form */}
            <AgentForm
              key={key}
              onSearch={setSearch}
              onSortChange={setSortBy}
              onReset={handleResetFilters}
              searchValue={filters.search}
              sortValue={filters.sortBy || 'newest'}
              totalResults={filteredAgents.length}
            />

            {/* No Results Message */}
            {noResultsAfterFilter ? (
              <motion.div
                className="flex flex-col items-center justify-center h-64 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900">No agents found</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Try adjusting your search or filters
                </p>
                <Button
                  onClick={handleResetFilters}
                  variant="outline"
                  className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Clear Filters
                </Button>
              </motion.div>
            ) : (
              <>
                {/* Data Table - Show paginated agents */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 flex-1"
                >
                  <DataTable
                    columns={columns}
                    data={paginatedAgents}
                    isLoading={isLoading}
                  />
                </motion.div>

                {/* Pagination Info and Controls */}
                <motion.div
                  className="flex items-center justify-between gap-4 py-4 flex-shrink-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Page Info */}
                  <div>
                    <p className="text-slate-400 font-medium text-sm">
                      Page <span className="text-slate-100 font-bold">{paginationInfo.currentPage}</span> of{" "}
                      <span className="text-slate-100 font-bold">{paginationInfo.totalPages}</span>
                    </p>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      onClick={previousPage}
                      disabled={!paginationInfo.hasPreviousPage}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all text-sm ${
                        paginationInfo.hasPreviousPage
                          ? 'text-slate-200 hover:bg-slate-700/50 cursor-pointer'
                          : 'text-slate-600 cursor-not-allowed opacity-40'
                      }`}
                      whileHover={paginationInfo.hasPreviousPage ? { scale: 1.05 } : {}}
                      whileTap={paginationInfo.hasPreviousPage ? { scale: 0.95 } : {}}
                    >
                      Previous
                    </motion.button>

                    <motion.button
                      onClick={nextPage}
                      disabled={!paginationInfo.hasNextPage}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all text-sm ${
                        paginationInfo.hasNextPage
                          ? 'text-slate-200 hover:bg-slate-700/50 cursor-pointer'
                          : 'text-slate-600 cursor-not-allowed opacity-40'
                      }`}
                      whileHover={paginationInfo.hasNextPage ? { scale: 1.05 } : {}}
                      whileTap={paginationInfo.hasNextPage ? { scale: 0.95 } : {}}
                    >
                      Next
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}