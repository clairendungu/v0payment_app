import { Badge } from "@/components/ui/badge"
import { createServerClient } from "@/lib/supabase-server"
import { TransactionHistory } from "@/components/transaction-history"
import { TransactionDashboard } from "@/components/transaction-dashboard"

export default async function HistoryPage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get all user transactions without limit
  const { data: transactions } = await supabase
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
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground mt-2">View and manage your payment history</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <TransactionDashboard transactions={transactions || []} />
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Transaction Status Legend</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">completed</Badge>
              <span className="text-sm">Successfully processed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">flagged</Badge>
              <span className="text-sm">Flagged for security review</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">failed</Badge>
              <span className="text-sm">Transaction failed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                Flagged
              </Badge>
              <span className="text-sm">Potential security risk</span>
            </div>
          </div>
        </div>
      </div>

      <TransactionHistory transactions={transactions || []} />
    </div>
  )
}
