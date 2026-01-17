'use client'

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Loader2 } from "lucide-react"

interface InformationClauseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InformationClauseDialog({
  open,
  onOpenChange,
}: InformationClauseDialogProps) {
  const [clause, setClause] = useState<{ title: string; content: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && !clause) {
      fetchClause()
    }
  }, [open])

  const fetchClause = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/public/newsletter/information-clause")
      
      if (!response.ok) {
        throw new Error("Failed to fetch information clause")
      }

      const data = await response.json()
      setClause(data)
    } catch (err: any) {
      console.error("Error fetching information clause:", err)
      setError(err.message || "Failed to load information clause")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {clause?.title || "Information Clause"}
          </DialogTitle>
          <DialogDescription>
            Newsletter Subscription Privacy Information
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <button
                onClick={fetchClause}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : clause ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: clause.content }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
