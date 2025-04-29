"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { processPayment } from "@/app/dashboard/payments/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PaymentForm() {
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [description, setDescription] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardName, setCardName] = useState("")
  const [ipAddress, setIpAddress] = useState("")
  const [deviceId, setDeviceId] = useState("")
  const [country, setCountry] = useState("US")
  const [city, setCity] = useState("")
  const [merchantCategory, setMerchantCategory] = useState("retail")
  const [error, setError] = useState<string | null>(null)
  const [userChecked, setUserChecked] = useState(false)

  // Check if user exists in the database
  useEffect(() => {
    if (user && !userChecked) {
      const checkUser = async () => {
        try {
          // Check if user exists in the database
          const { data, error } = await supabase.from("users").select("id").eq("id", user.id).single()

          if (error && error.code === "PGRST116") {
            // User doesn't exist, create them
            console.log("Creating user profile for:", user.id)
            const { error: createError } = await supabase.from("users").insert({
              id: user.id,
              email: user.email || "unknown@example.com",
              full_name: user.user_metadata?.full_name || "Unknown User",
              created_at: new Date().toISOString(),
            })

            if (createError) {
              console.error("Error creating user profile:", createError)
              if (createError.message.includes("duplicate key")) {
                // User exists with this email but different ID
                // This is a complex case that should be handled by an admin
                setError("User profile issue detected. Please contact support.")
              } else {
                setError("Failed to create user profile. Some features may be limited.")
              }
            }
          }
          setUserChecked(true)
        } catch (err) {
          console.error("Error checking user:", err)
        }
      }

      checkUser()
    }
  }, [user, supabase, userChecked])

  // Simulate getting device and location info
  useEffect(() => {
    // Generate a random IP address for demo purposes
    const randomIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(
      Math.random() * 255,
    )}.${Math.floor(Math.random() * 255)}`
    setIpAddress(randomIp)

    // Generate a random device ID for demo purposes
    const randomDeviceId = `device_${Math.random().toString(36).substring(2, 15)}`
    setDeviceId(randomDeviceId)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!user) {
        throw new Error("You must be logged in to make a payment")
      }

      // Format card details for display (in a real app, you'd use a payment processor)
      const last4 = cardNumber.slice(-4)
      const cardBrand = getCardBrand(cardNumber)

      // Process the payment using server action with enhanced data
      const result = await processPayment({
        userId: user.id, // This will be overridden in the server action with the authenticated user's ID
        amount: Number.parseFloat(amount),
        currency,
        description,
        cardDetails: {
          last4,
          brand: cardBrand,
        },
        ipAddress,
        deviceId,
        location: {
          country,
          city,
        },
        merchantCategory,
      })

      if (!result.success) {
        throw new Error(result.error || "Payment processing failed")
      }

      if (result.flagged) {
        toast({
          title: "Payment Flagged",
          description: `Your payment was flagged by our security system and is pending review. Risk factors: ${
            result.riskFactors?.join(", ") || "Unknown"
          }`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Payment Successful",
          description: `Your payment of ${currency} ${amount} was processed successfully.`,
        })
      }

      // Redirect to transaction history
      router.push("/dashboard/history")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "There was an error processing your payment.")
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Simple card brand detection based on first digit
  const getCardBrand = (number: string): string => {
    const firstDigit = number.charAt(0)
    if (firstDigit === "4") return "Visa"
    if (firstDigit === "5") return "Mastercard"
    if (firstDigit === "3") return "Amex"
    if (firstDigit === "6") return "Discover"
    return "Unknown"
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(" ")
    } else {
      return value
    }
  }

  // Format card expiry as MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")

    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }

    return v
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>Enter your payment information below</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>ML Fraud Detection Active</AlertTitle>
            <AlertDescription>
              Our advanced machine learning system will analyze this transaction for potential fraud.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Payment description"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchantCategory">Merchant Category</Label>
              <Select value={merchantCategory} onValueChange={setMerchantCategory}>
                <SelectTrigger id="merchantCategory">
                  <SelectValue placeholder="Select merchant category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="food">Food & Dining</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="gambling">Gambling</SelectItem>
                  <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                  <SelectItem value="money_transfer">Money Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="XX">High Risk Country</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <h3 className="font-medium">Card Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">Name on card</Label>
                <Input
                  id="cardName"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input
                  id="cardNumber"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Expiry date</Label>
                  <Input
                    id="cardExpiry"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardCvc">CVC</Label>
                  <Input
                    id="cardCvc"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Make Payment"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
