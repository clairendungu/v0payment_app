"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface ModelVisualizationProps {
  transactions: any[]
}

export function MLModelVisualization({ transactions }: ModelVisualizationProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // Calculate metrics
  const totalTransactions = transactions.length
  const flaggedTransactions = transactions.filter((tx) => tx.is_flagged).length
  const flaggedPercentage = totalTransactions > 0 ? (flaggedTransactions / totalTransactions) * 100 : 0

  // Calculate algorithm metrics
  const ifFlaggedCount = transactions.filter((tx) => {
    if (tx.anomaly_logs && tx.anomaly_logs.length > 0) {
      const features = tx.anomaly_logs[0].features
      return features.if_score > 0.5 // Using the IF threshold
    }
    return false
  }).length

  const ahcFlaggedCount = transactions.filter((tx) => {
    if (tx.anomaly_logs && tx.anomaly_logs.length > 0) {
      const features = tx.anomaly_logs[0].features
      return features.ahc_result === true
    }
    return false
  }).length

  const bothFlaggedCount = transactions.filter((tx) => {
    if (tx.anomaly_logs && tx.anomaly_logs.length > 0) {
      const features = tx.anomaly_logs[0].features
      return features.if_score > 0.5 && features.ahc_result === true
    }
    return false
  }).length

  const ifOnlyFlaggedCount = ifFlaggedCount - bothFlaggedCount
  const ahcOnlyFlaggedCount = ahcFlaggedCount - bothFlaggedCount

  // Calculate risk factor counts
  const riskFactorCounts: Record<string, number> = {}

  transactions.forEach((tx) => {
    if (tx.anomaly_logs && tx.anomaly_logs.length > 0) {
      const features = tx.anomaly_logs[0].features

      // Extract risk factors
      if (tx.is_flagged) {
        // These would come from the actual risk factors in a real implementation
        if (features.amount > 1000) {
          riskFactorCounts["Large amount"] = (riskFactorCounts["Large amount"] || 0) + 1
        }
        if (features.is_new_payment_method) {
          riskFactorCounts["New payment method"] = (riskFactorCounts["New payment method"] || 0) + 1
        }
        if (features.is_international) {
          riskFactorCounts["International"] = (riskFactorCounts["International"] || 0) + 1
        }
        if (features.is_high_risk_country) {
          riskFactorCounts["High-risk country"] = (riskFactorCounts["High-risk country"] || 0) + 1
        }
        if (features.transaction_velocity > 3) {
          riskFactorCounts["High velocity"] = (riskFactorCounts["High velocity"] || 0) + 1
        }
        if (features.time_of_day < 6 || features.time_of_day > 22) {
          riskFactorCounts["Unusual hours"] = (riskFactorCounts["Unusual hours"] || 0) + 1
        }
      }
    }
  })

  // Sort risk factors by count
  const sortedRiskFactors = Object.entries(riskFactorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Calculate confidence distribution
  const confidenceBuckets = {
    low: 0,
    medium: 0,
    high: 0,
  }

  transactions.forEach((tx) => {
    if (tx.anomaly_logs && tx.anomaly_logs.length > 0) {
      const features = tx.anomaly_logs[0].features
      const confidence = features.confidence || 0

      if (confidence < 0.4) {
        confidenceBuckets.low++
      } else if (confidence < 0.7) {
        confidenceBuckets.medium++
      } else {
        confidenceBuckets.high++
      }
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sequential ML Fraud Detection</CardTitle>
        <CardDescription>Isolation Forest followed by AHC clustering</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
            <TabsTrigger value="risk-factors">Risk Factors</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Flagged Transactions</span>
                <span className="text-sm font-medium">{flaggedPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={flaggedPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {flaggedTransactions} of {totalTransactions} transactions
                </span>
                <span className={flaggedPercentage > 10 ? "text-destructive" : "text-green-500"}>
                  {flaggedPercentage > 10 ? "High" : "Normal"}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <h4 className="text-sm font-medium mb-2">Confidence Distribution</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <div className="text-xs">Low</div>
                  <Progress
                    value={totalTransactions > 0 ? (confidenceBuckets.low / totalTransactions) * 100 : 0}
                    className="h-2 bg-green-100"
                  />
                  <div className="text-xs text-right">{confidenceBuckets.low}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs">Medium</div>
                  <Progress
                    value={totalTransactions > 0 ? (confidenceBuckets.medium / totalTransactions) * 100 : 0}
                    className="h-2 bg-yellow-100"
                  />
                  <div className="text-xs text-right">{confidenceBuckets.medium}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs">High</div>
                  <Progress
                    value={totalTransactions > 0 ? (confidenceBuckets.high / totalTransactions) * 100 : 0}
                    className="h-2 bg-red-100"
                  />
                  <div className="text-xs text-right">{confidenceBuckets.high}</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="algorithms" className="pt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Sequential Algorithm Results</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Isolation Forest Flagged</span>
                    <span className="text-sm font-medium">{ifFlaggedCount}</span>
                  </div>
                  <Progress
                    value={totalTransactions > 0 ? (ifFlaggedCount / totalTransactions) * 100 : 0}
                    className="h-2"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AHC Confirmed</span>
                    <span className="text-sm font-medium">{ahcFlaggedCount}</span>
                  </div>
                  <Progress
                    value={totalTransactions > 0 ? (ahcFlaggedCount / totalTransactions) * 100 : 0}
                    className="h-2"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Both Algorithms Agreed</span>
                    <span className="text-sm font-medium">{bothFlaggedCount}</span>
                  </div>
                  <Progress
                    value={totalTransactions > 0 ? (bothFlaggedCount / totalTransactions) * 100 : 0}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium mb-2">Sequential Process</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step 1: Isolation Forest</Badge>
                    <span className="text-xs text-muted-foreground">
                      Identifies potential anomalies based on isolation scores
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step 2: AHC</Badge>
                    <span className="text-xs text-muted-foreground">
                      Clusters potential anomalies to confirm or reject
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risk-factors" className="pt-4">
            <h4 className="text-sm font-medium mb-3">Top Risk Factors</h4>
            {sortedRiskFactors.length > 0 ? (
              <div className="space-y-3">
                {sortedRiskFactors.map(([factor, count]) => (
                  <div key={factor} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{factor}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <Progress
                      value={flaggedTransactions > 0 ? (count / flaggedTransactions) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2">No risk factors detected yet</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
