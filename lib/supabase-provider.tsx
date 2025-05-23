"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/lib/database.types"

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  user: any
  loading: boolean
  initError: string | null
}

const Context = createContext<SupabaseContext | undefined>(undefined)

// Update the SupabaseProvider component to ensure proper initialization
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => {
    // Make sure we have the environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables")
      // Return a dummy client that won't actually work
      return createClient("https://example.com", "dummy-key")
    }
    return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Add this after the useState for supabase
  const [initError, setInitError] = useState<string | null>(null)

  // Modify the useEffect to include better error handling
  useEffect(() => {
    // Check if Supabase is properly initialized
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables - authentication will fail")
      setInitError("Supabase configuration is missing. Please check environment variables.")
      setLoading(false)
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)
      if (session) {
        setUser(session.user)

        // Check if user exists in the database
        try {
          const { data, error } = await supabase.from("users").select("id, email").eq("id", session.user.id).single()

          if (error && error.code === "PGRST116") {
            // User doesn't exist by ID, check by email
            const { data: userByEmail, error: emailError } = await supabase
              .from("users")
              .select("id")
              .eq("email", session.user.email)
              .single()

            if (emailError && emailError.code === "PGRST116") {
              // User doesn't exist at all, create them
              console.log("Creating user profile for:", session.user.id)
              const { error: createError } = await supabase.from("users").insert({
                id: session.user.id,
                email: session.user.email || "unknown@example.com",
                full_name: session.user.user_metadata?.full_name || "Unknown User",
                created_at: new Date().toISOString(),
              })

              if (createError) {
                console.error("Error creating user profile:", createError)
                toast({
                  title: "Error",
                  description: "Failed to create user profile. Some features may be limited.",
                  variant: "destructive",
                })
              }
            } else if (userByEmail) {
              // User exists with this email but different ID
              console.log("User exists with email but different ID. Updating ID.")
              const { error: updateError } = await supabase
                .from("users")
                .update({ id: session.user.id })
                .eq("email", session.user.email)

              if (updateError) {
                console.error("Error updating user ID:", updateError)
                toast({
                  title: "Error",
                  description: "Failed to update user profile. Some features may be limited.",
                  variant: "destructive",
                })
              }
            }
          }
        } catch (error) {
          console.error("Error checking user profile:", error)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error)
        setInitError("Failed to initialize authentication. Please check your network connection and try again.")
      }

      if (session) {
        setUser(session.user)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, toast])

  // Add this to the Context.Provider value
  return (
    <Context.Provider value={{ supabase, user, loading, initError }}>
      {initError && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-destructive mb-4">Authentication Error</h2>
            <p className="mb-4">{initError}</p>
            <p className="text-sm text-muted-foreground mb-4">
              This could be due to missing environment variables or network connectivity issues.
            </p>
            <button
              className="bg-primary text-primary-foreground px-4 py-2 rounded"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}
