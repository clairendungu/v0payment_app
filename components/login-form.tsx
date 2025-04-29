"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export function LoginForm() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Add a function to initialize the database
  const initializeDatabase = async () => {
    try {
      await fetch("/api/init-db")
      console.log("Database initialized")
    } catch (error) {
      console.error("Failed to initialize database:", error)
    }
  }

  // Modify the handleSubmit function to initialize the database first
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null) // Add this line to clear previous errors

    try {
      // Initialize database first
      await initializeDatabase()

      console.log("Attempting to sign in with email:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Authentication error:", error)
        throw error
      }

      if (!data.user) {
        throw new Error("No user returned from authentication")
      }

      console.log("Authentication successful for user:", data.user.id)
      toast({
        title: "Success",
        description: "You have been logged in successfully.",
      })

      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      console.error("Login error details:", error)
      setError(error.message || "Failed to sign in") // Add this line to store the error
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="p-4 mb-4 text-sm border border-destructive text-destructive rounded-md bg-destructive/10">
          <p>
            <strong>Error:</strong> {error}
          </p>
          <p className="mt-2 text-xs">
            If you're seeing this after deployment, please check that your environment variables are correctly set.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email">Email address</Label>
          <div className="mt-2">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="mt-2">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </>
  )
}
