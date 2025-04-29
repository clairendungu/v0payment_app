"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  is_flagged: boolean
  created_at: string
  payment_methods: {
    card_last_four: string
    card_brand: string
  } | null
  anomaly_logs?:
    | {
        score: number
        threshold: number
        is_anomaly: boolean
        features: any
      }[]
    | null
}

interface RecentTransactionsProps {
  transactions: Transaction[]
  onViewDetails?: (transaction: Transaction) => void
}

export function RecentTransactions({ transactions, onViewDetails }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest payment activity</CardDescription>
        </div>
        {transactions.length > 0 && (
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/history">View All</a>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No transactions yet</div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      ${transaction.amount.toFixed(2)} {transaction.currency}
                    </span>
                    {transaction.is_flagged && (
                      <Badge variant="destructive" className="text-xs">
                        Flagged
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{transaction.description || "No description"}</div>
                  <div className="text-xs text-muted-foreground">
                    {transaction.payment_methods?.card_brand || "Unknown"} ••••{" "}
                    {transaction.payment_methods?.card_last_four || "Unknown"}
                  </div>
                  {transaction.anomaly_logs && transaction.anomaly_logs.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Score: {transaction.anomaly_logs[0].score.toFixed(3)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <Badge
                    variant={
                      transaction.status === "completed"
                        ? "default"
                        : transaction.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {transaction.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </div>
                  {onViewDetails && (
                    <Button variant="ghost" size="sm" className="mt-1" onClick={() => onViewDetails(transaction)}>
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
