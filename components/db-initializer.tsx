"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

export function DbInitializer() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const initializeDb = async () => {
    setIsInitializing(true)
    setError(null)

    try {
      const response = await fetch("/api/init-db")
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to initialize database")
      }

      setIsInitialized(true)
      toast({
        title: "Success",
        description: "Database initialized successfully.",
      })
    } catch (err: any) {
      setError(err.message || "An error occurred while initializing the database")
      toast({
        title: "Error",
        description: err.message || "Failed to initialize database",
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isInitialized ? (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Database initialized successfully. You can now use the application.</AlertDescription>
        </Alert>
      ) : (
        <Button onClick={initializeDb} disabled={isInitializing}>
          {isInitializing ? "Initializing..." : "Initialize Database"}
        </Button>
      )}
    </div>
  )
}
