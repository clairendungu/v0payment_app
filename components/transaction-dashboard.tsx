import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface TransactionStats {
  totalTransactions: number
  totalAmount: number
  completedTransactions: number
  flaggedTransactions: number
}

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  is_flagged: boolean
  created_at: string
}

export function TransactionDashboard({ transactions = [] }: { transactions: Transaction[] }) {
  // Calculate statistics
  const stats: TransactionStats = {
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
    completedTransactions: transactions.filter((tx) => tx.status === "completed").length,
    flaggedTransactions: transactions.filter((tx) => tx.is_flagged).length,
  }

  // Calculate percentages
  const completedPercentage =
    stats.totalTransactions > 0 ? (stats.completedTransactions / stats.totalTransactions) * 100 : 0

  const flaggedPercentage =
    stats.totalTransactions > 0 ? (stats.flaggedTransactions / stats.totalTransactions) * 100 : 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transaction Dashboard</CardTitle>
        <CardDescription>Summary of all your processed transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Transactions</span>
          <span className="font-medium">{stats.totalTransactions}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Amount Processed</span>
          <span className="font-medium">${stats.totalAmount.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completed Transactions</span>
            <span className="text-sm font-medium">{completedPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={completedPercentage} className="h-2 bg-green-100" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.completedTransactions} transactions</span>
            <Badge variant="outline" className="bg-green-50">
              Completed
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Flagged Transactions</span>
            <span className="text-sm font-medium">{flaggedPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={flaggedPercentage} className="h-2 bg-red-100" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.flaggedTransactions} transactions</span>
            <Badge variant="destructive">Flagged</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
