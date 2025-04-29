import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const supabase = createServerClient()

  try {
    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check transactions table
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)

    // Check dashboard_stats table
    const { data: dashboardStats, error: statsError } = await supabase
      .from("dashboard_stats")
      .select("*")
      .eq("user_id", user.id)

    // Try to call the update_dashboard_stats function
    let functionResult = null
    let functionError = null

    try {
      await supabase.rpc("update_dashboard_stats", { user_id_param: user.id })
      functionResult = "Function called successfully"
    } catch (error: any) {
      functionError = error.message || "Unknown error"
    }

    // Check if the function exists
    let functionExists = false
    try {
      const { data } = await supabase.rpc("get_transaction_stats", {
        user_id_param: user.id,
      })
      functionExists = true
    } catch (error) {
      functionExists = false
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      transactions: {
        count: transactions?.length || 0,
        data: transactions,
        error: txError,
      },
      dashboardStats: {
        data: dashboardStats,
        error: statsError,
      },
      functions: {
        update_dashboard_stats: {
          result: functionResult,
          error: functionError,
        },
        get_transaction_stats: {
          exists: functionExists,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
