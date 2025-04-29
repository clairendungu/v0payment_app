import { createServerClient } from "@/lib/supabase-server"
import { RecentTransactions } from "@/components/recent-transactions"
import { TransactionDashboard } from "@/components/transaction-dashboard"
import { TransactionExport } from "@/components/transaction-export"
import { DbInitializer } from "@/components/db-initializer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function DashboardPage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user profile
  const { data: profile, error: profileError } = await supabase.from("users").select("*").eq("id", user?.id).single()

  // Get all transactions for recent transactions display
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select(`
      *,
      payment_methods(card_last_four, card_brand),
      anomaly_logs(score, threshold, is_anomaly, features)
    `)
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Get all transactions for dashboard statistics
  const { data: allTransactionsForDashboard } = await supabase
    .from("transactions")
    .select(`
      *,
      payment_methods(card_last_four, card_brand),
      anomaly_logs(score, threshold, is_anomaly, features)
    `)
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name || user?.email}</p>
        </div>
        <div>
          <TransactionExport transactions={allTransactionsForDashboard || []} filename="securepay-transactions" />
        </div>
      </div>

      {profileError && (
        <Alert>
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription>
            <p className="mb-4">It appears there might be an issue with the database connection or setup.</p>
            <DbInitializer />
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8">
        <TransactionDashboard transactions={allTransactionsForDashboard || []} />
      </div>

      <RecentTransactions transactions={recentTransactions || []} />
    </div>
  )
}
