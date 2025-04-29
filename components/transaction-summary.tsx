import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TransactionSummaryProps {
  stats: {
    total_transactions: number
    total_amount: number
    avg_amount: number
    flagged_transactions: number
    completed_transactions?: number
  }
}

export function TransactionSummary({ stats }: TransactionSummaryProps) {
  // Check if the component is correctly receiving and displaying the stats
  console.log("TransactionSummary received stats:", stats)

  // Ensure stats has default values if any property is null or undefined
  const safeStats = {
    total_transactions: stats?.total_transactions || 0,
    total_amount: stats?.total_amount || 0,
    avg_amount: stats?.avg_amount || 0,
    flagged_transactions: stats?.flagged_transactions || 0,
    completed_transactions: stats?.completed_transactions || 0,
  }

  const flaggedPercentage =
    safeStats.total_transactions > 0
      ? ((safeStats.flagged_transactions / safeStats.total_transactions) * 100).toFixed(1)
      : "0.0"

  const completedPercentage =
    safeStats.total_transactions > 0
      ? ((safeStats.completed_transactions / safeStats.total_transactions) * 100).toFixed(1)
      : "0.0"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Summary</CardTitle>
        <CardDescription>Overview of your payment activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Total Processed</div>
            <div className="font-bold">${safeStats.total_amount.toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Transaction Count</div>
            <div className="font-bold">{safeStats.total_transactions}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Average Amount</div>
            <div className="font-bold">${safeStats.avg_amount.toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Completed Transactions</div>
            <div className="font-bold">
              {safeStats.completed_transactions} ({completedPercentage}%)
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Flagged Transactions</div>
            <div className="font-bold">
              {safeStats.flagged_transactions} ({flaggedPercentage}%)
            </div>
          </div>
          <div className="pt-4">
            <div className="text-sm font-medium mb-2">Security Status</div>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${Number(flaggedPercentage) > 10 ? "bg-destructive" : "bg-green-500"}`}
              ></div>
              <div className="text-sm">
                {Number(flaggedPercentage) > 10
                  ? "Attention needed: High rate of flagged transactions"
                  : "Good: Low rate of flagged transactions"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
