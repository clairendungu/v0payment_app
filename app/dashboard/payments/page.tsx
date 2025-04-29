import { PaymentForm } from "@/components/payment-form"

export default function PaymentsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Make a Payment</h1>
        <p className="text-muted-foreground mt-2">Process a secure payment with ML-powered fraud detection</p>
      </div>

      <PaymentForm />
    </div>
  )
}
