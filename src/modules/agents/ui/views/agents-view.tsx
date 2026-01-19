"use client"

import { useState, useEffect } from "react"
import { DataTable } from "../components/data-table"
import { columns } from "../components/columns"
import { EmptyState } from "@/components/empty-state"
import { Agent } from "@/modules/agents/types"
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

export const AgentsView = () => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [instructions, setInstructions] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  // Fetch agents on mount
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

      console.log("Fetch response status:", response.status)
      
      const text = await response.text()
      console.log("Response text:", text)
      
      const result = JSON.parse(text)
      console.log("Parsed result:", result)
      
      if (result.result?.data && Array.isArray(result.result.data)) {
        const transformedAgents = result.result.data.map((agent: any) => ({
          ...agent,
          meetingsCount: 5,
        }))
        console.log("Agents loaded:", transformedAgents)
        setAgents(transformedAgents)
      } else if (Array.isArray(result)) {
        const transformedAgents = result.map((agent: any) => ({
          ...agent,
          meetingsCount: 5,
        }))
        setAgents(transformedAgents)
      } else {
        console.error("Unexpected response format:", result)
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
      console.log("Creating agent:", { name, instructions })
      
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

      console.log("Create response status:", response.status)
      
      const text = await response.text()
      console.log("Create response text:", text)
      
      const result = JSON.parse(text)
      console.log("Create result:", result)

      if (response.ok) {
        console.log("Agent created successfully")
        // Refetch agents after creation
        await fetchAgents()
        setName("")
        setInstructions("")
        setOpen(false)
      } else {
        console.error("Failed to create agent:", result)
      }
    } catch (error) {
      console.error("Failed to create agent:", error)
    } finally {
      setIsCreating(false)
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h3 className="text-lg font-semibold text-red-600">Error loading agents</h3>
        <p className="text-sm text-gray-500">Please try again later</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Agents</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600 text-white gap-2">
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Add a new agent to your workspace
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="Enter agent name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isCreating}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Enter agent instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={isCreating}
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600"
                  disabled={isCreating || !name.trim() || !instructions.trim()}
                >
                  {isCreating ? "Creating..." : "Create Agent"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Show empty state when no agents and not loading */}
      {!isLoading && agents.length === 0 ? (
        <EmptyState onCreateClick={() => setOpen(true)} />
      ) : (
        <DataTable
          columns={columns}
          data={agents}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}