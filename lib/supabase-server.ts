import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

export const createServerClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables for server client")
    // Return a dummy client that won't actually work - this will cause errors but prevent crashes
    return createClient("https://example.com", "dummy-key")
  }

  try {
    return createClient<Database>(supabaseUrl, supabaseKey)
  } catch (error) {
    console.error("Failed to create Supabase server client:", error)
    // Return a dummy client that won't actually work - this will cause errors but prevent crashes
    return createClient("https://example.com", "dummy-key")
  }
}
