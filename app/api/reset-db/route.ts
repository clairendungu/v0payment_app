import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST() {
  const supabase = createServerClient()

  try {
    // Delete data from tables in the correct order to respect foreign key constraints
    console.log("Clearing anomaly_logs table...")
    await supabase.from("anomaly_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    console.log("Clearing transactions table...")
    await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    console.log("Clearing payment_methods table...")
    await supabase.from("payment_methods").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    console.log("Clearing users table...")
    await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    return NextResponse.json({ success: true, message: "Database cleared successfully" })
  } catch (error: any) {
    console.error("Failed to clear database:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
