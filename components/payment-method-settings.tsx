"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface PaymentMethod {
  id: string
  card_last_four: string
  card_brand: string
  is_default: boolean
}

interface PaymentMethodSettingsProps {
  paymentMethods: PaymentMethod[]
}

export function PaymentMethodSettings({ paymentMethods }: PaymentMethodSettingsProps) {
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardName, setCardName] = useState("")
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

  const handleDelete = async (id: string) => {
    setIsLoading(true)

    try {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Payment method removed",
        description: "Your payment method has been removed successfully.",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    setIsLoading(true)

    try {
      // First, set all payment methods to non-default
      await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user?.id)

      // Then, set the selected one as default
      const { error } = await supabase.from("payment_methods").update({ is_default: true }).eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Default payment method updated",
        description: "Your default payment method has been updated.",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update default payment method",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!user) {
        throw new Error("User not authenticated")
      }

      // First check if the user exists in the users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single()

      if (userCheckError) {
        console.error("Error checking user:", userCheckError)
        // If user doesn't exist, create the user first
        if (userCheckError.code === "PGRST116") {
          const { error: createUserError } = await supabase.from("users").insert({
            id: user.id,
            email: user.email || "unknown@example.com",
            full_name: user.user_metadata?.full_name || "Unknown User",
            created_at: new Date().toISOString(),
          })

          if (createUserError) {
            if (createUserError.message.includes("duplicate key")) {
              // User exists with this email but different ID
              // Try to find the user by email
              const { data: userByEmail } = await supabase.from("users").select("id").eq("email", user.email).single()

              if (userByEmail) {
                // Use the existing user ID for the payment method
                console.log("Using existing user ID for payment method:", userByEmail.id)
                user.id = userByEmail.id
              } else {
                throw new Error("Failed to create user profile: duplicate email exists but couldn't be found")
              }
            } else {
              throw new Error(`Failed to create user profile: ${createUserError.message}`)
            }
          }
        } else {
          throw userCheckError
        }
      }

      // Format card details (in a real app, you'd use a payment processor)
      const last4 = cardNumber.slice(-4)
      const cardBrand = getCardBrand(cardNumber)

      const { error } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        card_last_four: last4,
        card_brand: cardBrand,
        is_default: paymentMethods.length === 0, // Make default if it's the first one
      })

      if (error) {
        throw error
      }

      toast({
        title: "Payment method added",
        description: "Your payment method has been added successfully.",
      })

      setIsDialogOpen(false)
      setCardNumber("")
      setCardExpiry("")
      setCardCvc("")
      setCardName("")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "Failed to add payment method")
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
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
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Manage your saved payment methods</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {paymentMethods.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No payment methods saved</div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="font-medium">
                    {method.card_brand} •••• {method.card_last_four}
                  </div>
                  {method.is_default && <div className="text-xs text-muted-foreground">Default payment method</div>}
                </div>
                <div className="flex gap-2">
                  {!method.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={isLoading}
                    >
                      Set as default
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(method.id)} disabled={isLoading}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mt-4">Add Payment Method</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>Enter your card details to add a new payment method</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPaymentMethod}>
              <div className="space-y-4 py-4">
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
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Payment Method"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
