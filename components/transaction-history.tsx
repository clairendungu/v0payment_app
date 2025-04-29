"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { TransactionExport } from "@/components/transaction-export"
import { AlertCircle, Calendar, CreditCard, DollarSign, Tag } from "lucide-react"

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
  anomaly_logs:
    | {
        score: number
        threshold: number
        is_anomaly: boolean
        features: any
      }[]
    | null
}

interface TransactionHistoryProps {
  transactions: Transaction[]
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDialogOpen(true)
  }

  // Extract risk factors from features
  const getRiskFactors = (transaction: Transaction) => {
    if (!transaction.anomaly_logs || transaction.anomaly_logs.length === 0) {
      return []
    }

    const features = transaction.anomaly_logs[0].features
    const riskFactors = []

    // Amount-related risk
    if (features.amount > 1000) {
      riskFactors.push("Large transaction amount")
    }

    // Time-related risk
    const timeOfDay = features.time_of_day
    if (timeOfDay < 6 || timeOfDay > 22) {
      riskFactors.push("Transaction at unusual hours")
    }

    // User history risk
    if (features.user_transaction_count < 5) {
      riskFactors.push("New user account")
    }

    // Transaction velocity risk
    if (features.transaction_velocity > 3) {
      riskFactors.push("Multiple transactions in short time")
    }

    // Payment method risk
    if (features.is_new_payment_method) {
      riskFactors.push("New payment method")
    }

    // Location risk
    if (features.is_international) {
      riskFactors.push("International transaction")
    }

    if (features.is_high_risk_country) {
      riskFactors.push("High-risk country")
    }

    return riskFactors
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Transaction History</h2>
        <TransactionExport transactions={transactions} />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <TransactionTable transactions={transactions} onViewDetails={handleViewDetails} />
        </TabsContent>
        <TabsContent value="completed">
          <TransactionTable
            transactions={transactions.filter((t) => t.status === "completed")}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>
        <TabsContent value="flagged">
          <TransactionTable transactions={transactions.filter((t) => t.is_flagged)} onViewDetails={handleViewDetails} />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedTransaction && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>Transaction ID: {selectedTransaction.id}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <DollarSign className="mr-1 h-4 w-4" />
                    Amount
                  </div>
                  <div className="text-lg font-bold">
                    {selectedTransaction.currency} {selectedTransaction.amount.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    Status
                  </div>
                  <div>
                    <Badge
                      variant={
                        selectedTransaction.status === "completed"
                          ? "default"
                          : selectedTransaction.status === "flagged"
                            ? "destructive"
                            : selectedTransaction.status === "failed"
                              ? "destructive"
                              : "secondary"
                      }
                    >
                      {selectedTransaction.status}
                    </Badge>
                    {selectedTransaction.is_flagged && (
                      <Badge variant="outline" className="ml-2 bg-red-50">
                        Flagged
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Tag className="mr-1 h-4 w-4" />
                  Description
                </div>
                <div className="text-sm">{selectedTransaction.description || "No description provided"}</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CreditCard className="mr-1 h-4 w-4" />
                    Payment Method
                  </div>
                  <div className="text-sm">
                    {selectedTransaction.payment_methods?.card_brand || "Unknown"} ••••{" "}
                    {selectedTransaction.payment_methods?.card_last_four || "Unknown"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-1 h-4 w-4" />
                    Date & Time
                  </div>
                  <div className="text-sm">{new Date(selectedTransaction.created_at).toLocaleString()}</div>
                </div>
              </div>

              {selectedTransaction.anomaly_logs && selectedTransaction.anomaly_logs.length > 0 && (
                <div className="border rounded-md p-4 bg-slate-50">
                  <h4 className="text-sm font-medium mb-3">ML Security Analysis</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Final Anomaly Score</span>
                        <span className="text-sm font-medium">
                          {selectedTransaction.anomaly_logs[0].score.toFixed(4)}
                        </span>
                      </div>
                      <Progress value={selectedTransaction.anomaly_logs[0].score * 100} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Isolation Forest Score</div>
                        <div className="text-sm font-medium">
                          {selectedTransaction.anomaly_logs[0].features.if_score?.toFixed(4) || "N/A"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">AHC Result</div>
                        <Badge
                          variant={selectedTransaction.anomaly_logs[0].features.ahc_result ? "destructive" : "default"}
                        >
                          {selectedTransaction.anomaly_logs[0].features.ahc_result ? "Anomaly" : "Normal"}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Threshold</div>
                        <div className="text-sm font-medium">
                          {selectedTransaction.anomaly_logs[0].threshold.toFixed(4)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="text-sm font-medium">
                          {((selectedTransaction.anomaly_logs[0].features.confidence || 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {selectedTransaction.is_flagged && getRiskFactors(selectedTransaction).length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-xs text-muted-foreground mb-2">Risk Factors</h5>
                        <div className="grid grid-cols-1 gap-1">
                          {getRiskFactors(selectedTransaction).map((factor, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-destructive"></div>
                              <span className="text-sm">{factor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

interface TransactionTableProps {
  transactions: Transaction[]
  onViewDetails: (transaction: Transaction) => void
}

function TransactionTable({ transactions, onViewDetails }: TransactionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>A list of your transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No transactions found</div>
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
                      {transaction.currency} {transaction.amount.toFixed(2)}
                    </span>
                    {transaction.is_flagged && (
                      <Badge variant="destructive" className="text-xs">
                        Flagged
                      </Badge>
                    )}
                    {transaction.anomaly_logs &&
                      transaction.anomaly_logs.length > 0 &&
                      transaction.anomaly_logs[0].features.sequential_model && (
                        <Badge variant="outline" className="text-xs">
                          Sequential ML
                        </Badge>
                      )}
                  </div>
                  <div className="text-sm text-muted-foreground">{transaction.description || "No description"}</div>
                  <div className="text-xs text-muted-foreground">
                    {transaction.payment_methods?.card_brand || "Unknown"} ••••{" "}
                    {transaction.payment_methods?.card_last_four || "Unknown"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      transaction.status === "completed"
                        ? "default"
                        : transaction.status === "flagged"
                          ? "destructive"
                          : transaction.status === "failed"
                            ? "destructive"
                            : "secondary"
                    }
                  >
                    {transaction.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onViewDetails(transaction)}>
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
