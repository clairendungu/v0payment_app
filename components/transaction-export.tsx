"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileDown, FileText, Loader2 } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  is_flagged: boolean
  created_at: string
  payment_methods?: {
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

interface TransactionExportProps {
  transactions: Transaction[]
  filename?: string
}

export function TransactionExport({ transactions, filename = "transaction-history" }: TransactionExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Format transactions for CSV export
  const formatTransactionsForCSV = () => {
    // CSV header
    const header = [
      "Transaction ID",
      "Date",
      "Amount",
      "Currency",
      "Status",
      "Flagged",
      "Description",
      "Payment Method",
      "Card Number",
      "Anomaly Score",
    ].join(",")

    // Format each transaction as a CSV row
    const rows = transactions.map((tx) => {
      const date = new Date(tx.created_at).toLocaleString()
      const amount = tx.amount.toFixed(2)
      const status = tx.status
      const flagged = tx.is_flagged ? "Yes" : "No"
      const description = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : ""
      const paymentMethod = tx.payment_methods?.card_brand || ""
      const cardNumber = tx.payment_methods ? `****${tx.payment_methods.card_last_four}` : ""
      const anomalyScore = tx.anomaly_logs && tx.anomaly_logs.length > 0 ? tx.anomaly_logs[0].score.toFixed(4) : ""

      return [
        tx.id,
        date,
        amount,
        tx.currency,
        status,
        flagged,
        description,
        paymentMethod,
        cardNumber,
        anomalyScore,
      ].join(",")
    })

    return [header, ...rows].join("\n")
  }

  // Format transactions for JSON export
  const formatTransactionsForJSON = () => {
    return JSON.stringify(
      transactions.map((tx) => ({
        id: tx.id,
        date: new Date(tx.created_at).toLocaleString(),
        amount: `${tx.currency} ${tx.amount.toFixed(2)}`,
        status: tx.status,
        flagged: tx.is_flagged,
        description: tx.description || "",
        paymentMethod: tx.payment_methods
          ? `${tx.payment_methods.card_brand} ****${tx.payment_methods.card_last_four}`
          : "",
        anomalyScore: tx.anomaly_logs && tx.anomaly_logs.length > 0 ? tx.anomaly_logs[0].score : null,
      })),
      null,
      2,
    )
  }

  // Download as CSV
  const downloadCSV = () => {
    setIsExporting(true)
    try {
      const csvContent = formatTransactionsForCSV()
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const currentDate = formatDate(new Date())

      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}-${currentDate}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting CSV:", error)
    } finally {
      setIsExporting(false)
    }
  }

  // Download as JSON
  const downloadJSON = () => {
    setIsExporting(true)
    try {
      const jsonContent = formatTransactionsForJSON()
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const currentDate = formatDate(new Date())

      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}-${currentDate}.json`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting JSON:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || transactions.length === 0}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={downloadCSV} disabled={isExporting}>
          <FileDown className="mr-2 h-4 w-4" />
          <span>Download as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadJSON} disabled={isExporting}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Download as JSON</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
