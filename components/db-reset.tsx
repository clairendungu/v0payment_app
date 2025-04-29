"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function DbReset() {
  const [isResetting, setIsResetting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const resetDb = async () => {
    setIsResetting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/reset-db", {
        method: "POST",
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to reset database")
      }

      setSuccess(true)
      toast({
        title: "Success",
        description: "Database reset successfully. Please refresh the page.",
      })
    } catch (err: any) {
      setError(err.message || "An error occurred while resetting the database")
      toast({
        title: "Error",
        description: err.message || "Failed to reset database",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
      setIsDialogOpen(false)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Reset Database</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Database</DialogTitle>
          <DialogDescription>
            This will delete all data from the database. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Database reset successfully. Please refresh the page.</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isResetting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={resetDb} disabled={isResetting}>
            {isResetting ? "Resetting..." : "Reset Database"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
