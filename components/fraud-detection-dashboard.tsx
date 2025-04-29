"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface FraudMetrics {
  totalTransactions: number
  flaggedTransactions: number
  flaggedAmount: number
  totalAmount: number
  riskFactorCounts: {
    [key: string]: number
  }
}

export function FraudDetectionDashboard({ metrics }: { metrics: FraudMetrics }) {
  const flaggedPercentage =
    metrics.totalTransactions > 0 ? (metrics.flaggedTransactions / metrics.totalTransactions) * 100 : 0

  const flaggedAmountPercentage = metrics.totalAmount > 0 ? (metrics.flaggedAmount / metrics.totalAmount) * 100 : 0

  // Sort risk factors by count
  const sortedRiskFactors = Object.entries(metrics.riskFactorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 risk factors

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fraud Detection Metrics</CardTitle>
        <CardDescription>ML-powered transaction security analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Flagged Transactions</span>
            <span className="text-sm font-medium">{flaggedPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={flaggedPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {metrics.flaggedTransactions} of {metrics.totalTransactions} transactions
            </span>
            <span className={flaggedPercentage > 10 ? "text-destructive" : "text-green-500"}>
              {flaggedPercentage > 10 ? "High" : "Normal"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Flagged Amount</span>
            <span className="text-sm font-medium">{flaggedAmountPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={flaggedAmountPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              ${metrics.flaggedAmount.toFixed(2)} of ${metrics.totalAmount.toFixed(2)}
            </span>
            <span className={flaggedAmountPercentage > 15 ? "text-destructive" : "text-green-500"}>
              {flaggedAmountPercentage > 15 ? "High" : "Normal"}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="text-sm font-medium mb-3">Top Risk Factors</h4>
          {sortedRiskFactors.length > 0 ? (
            <div className="space-y-3">
              {sortedRiskFactors.map(([factor, count]) => (
                <div key={factor} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{factor}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <Progress value={(count / metrics.flaggedTransactions) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">No risk factors detected yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
