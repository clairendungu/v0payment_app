"use server"

import { createServerClient } from "@/lib/supabase-server"
import { detectAnomaly, trainModel } from "@/lib/ml-model"
import { v4 as uuidv4 } from "uuid"

interface PaymentDetails {
  userId: string
  amount: number
  currency: string
  description: string
  cardDetails: {
    last4: string
    brand: string
  }
  ipAddress?: string
  deviceId?: string
  location?: {
    country?: string
    city?: string
  }
  merchantCategory?: string
}

export async function processPayment(details: PaymentDetails) {
  const supabase = createServerClient()

  try {
    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Authentication error:", authError)
      throw new Error("User not authenticated")
    }

    // Use the authenticated user's ID
    const userId = user.id
    const userEmail = user.email || "unknown@example.com"

    // First check if a user with this email already exists
    const { data: existingUserByEmail, error: emailCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle()

    if (emailCheckError) {
      console.error("Error checking existing user by email:", emailCheckError)
    }

    // If a user with this email exists but with a different ID, we need to use that ID
    if (existingUserByEmail && existingUserByEmail.id !== userId) {
      console.log(`User with email ${userEmail} exists with different ID. Using existing ID.`)
      // We'll use the existing user ID for all operations
    }

    // Check if user exists in the users table with the auth user ID
    const { data: userProfile, error: userProfileError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (userProfileError) {
      console.error("User profile error:", userProfileError)
      throw new Error("Error retrieving user profile")
    }

    // If user doesn't exist with the auth ID, we need to handle it
    if (!userProfile) {
      console.log("User profile not found with ID:", userId)

      // If we found a user with the same email, we'll skip creation
      if (!existingUserByEmail) {
        console.log("Creating new user profile...")

        // Create user profile in the database
        const { error: createProfileError } = await supabase.from("users").insert({
          id: userId,
          email: userEmail,
          full_name: user.user_metadata?.full_name || "Unknown User",
          created_at: new Date().toISOString(),
        })

        if (createProfileError) {
          console.error("Create profile error:", createProfileError)

          // If it's a duplicate key error, we'll try to find the user again
          if (createProfileError.message.includes("duplicate key")) {
            console.log("Duplicate key error. Trying to find existing user...")

            // Try to find the user one more time (race condition handling)
            const { data: retryUser } = await supabase.from("users").select("id").eq("email", userEmail).maybeSingle()

            if (!retryUser) {
              throw new Error(`Failed to create or find user profile: ${createProfileError.message}`)
            }

            console.log("Found existing user on retry:", retryUser.id)
          } else {
            throw new Error(`Failed to create user profile: ${createProfileError.message}`)
          }
        }
      }
    }

    // Use the existing user ID if we found one by email
    const effectiveUserId = existingUserByEmail ? existingUserByEmail.id : userId

    // Get user transaction history for ML features
    const { data: userTransactions } = await supabase
      .from("transactions")
      .select("amount, created_at")
      .eq("user_id", effectiveUserId)

    // Calculate features for ML model
    const transactionCount = userTransactions?.length || 0
    const totalAmount = userTransactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0
    const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0

    // Calculate transaction velocity (transactions in the last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recentTransactions = userTransactions?.filter((tx) => tx.created_at > oneHourAgo) || []
    const transactionVelocity = recentTransactions.length

    // Check if this is a new payment method
    const { data: existingPaymentMethod, error: paymentMethodQueryError } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("user_id", effectiveUserId)
      .eq("card_last_four", details.cardDetails.last4)
      .eq("card_brand", details.cardDetails.brand)
      .maybeSingle()

    if (paymentMethodQueryError && paymentMethodQueryError.code !== "PGRST116") {
      console.error("Payment method query error:", paymentMethodQueryError)
    }

    const isNewPaymentMethod = !existingPaymentMethod

    // Get current time information
    const now = new Date()
    const hourOfDay = now.getHours()
    const dayOfWeek = now.getDay()

    // Determine if transaction is international (simplified example)
    const isInternational = details.location?.country !== "US"
    const isHighRiskCountry = details.location?.country === "XX" // Example high-risk country

    // Run anomaly detection with enhanced features
    const anomalyResult = await detectAnomaly({
      amount: details.amount,
      userId: effectiveUserId,
      timeOfDay: hourOfDay,
      dayOfWeek: dayOfWeek,
      userTransactionCount: transactionCount,
      userAverageAmount: averageAmount,
      transactionVelocity,
      isNewPaymentMethod,
      ipAddress: details.ipAddress,
      deviceId: details.deviceId,
      location: details.location,
      isInternational,
      isHighRiskCountry,
      merchantCategory: details.merchantCategory,
    })

    // Process payment method
    let paymentMethodId = existingPaymentMethod?.id

    // If payment method doesn't exist, create it
    if (!paymentMethodId) {
      // Generate a UUID for the payment method
      const newPaymentMethodId = uuidv4()

      // First, check if the user has any payment methods
      const { data: existingMethods, error: existingMethodsError } = await supabase
        .from("payment_methods")
        .select("id")
        .eq("user_id", effectiveUserId)
        .limit(1)

      if (existingMethodsError) {
        console.error("Error checking existing payment methods:", existingMethodsError)
      }

      // Set as default if it's the first payment method
      const isDefault = !existingMethods || existingMethods.length === 0

      // Insert the payment method without returning data
      const { error: paymentMethodError } = await supabase.from("payment_methods").insert({
        id: newPaymentMethodId,
        user_id: effectiveUserId,
        card_last_four: details.cardDetails.last4,
        card_brand: details.cardDetails.brand,
        is_default: isDefault,
        created_at: new Date().toISOString(),
      })

      if (paymentMethodError) {
        console.error("Payment method creation error:", paymentMethodError)
        throw new Error(`Failed to save payment method: ${paymentMethodError.message}`)
      }

      paymentMethodId = newPaymentMethodId
    }

    // Generate a UUID for the transaction
    const transactionId = uuidv4()

    // Create the transaction without returning data
    // Changed status from "pending_review" to "flagged" for flagged transactions
    const { error: transactionError } = await supabase.from("transactions").insert({
      id: transactionId,
      user_id: effectiveUserId,
      payment_method_id: paymentMethodId,
      amount: details.amount,
      currency: details.currency,
      description: details.description,
      status: anomalyResult.isAnomaly ? "flagged" : "completed", // Changed from "pending_review" to "flagged"
      anomaly_score: anomalyResult.score,
      is_flagged: anomalyResult.isAnomaly,
      created_at: new Date().toISOString(),
    })

    if (transactionError) {
      console.error("Transaction creation error:", transactionError)
      throw new Error(`Failed to process transaction: ${transactionError.message}`)
    }

    // Generate a UUID for the anomaly log
    const anomalyLogId = uuidv4()

    // Log the anomaly detection result with enhanced features
    const { error: anomalyLogError } = await supabase.from("anomaly_logs").insert({
      id: anomalyLogId,
      transaction_id: transactionId,
      features: {
        amount: details.amount,
        user_transaction_count: transactionCount,
        user_average_amount: averageAmount,
        time_of_day: hourOfDay,
        day_of_week: dayOfWeek,
        transaction_velocity: transactionVelocity,
        is_new_payment_method: isNewPaymentMethod,
        is_international: isInternational,
        is_high_risk_country: isHighRiskCountry,
        ip_address: details.ipAddress,
        device_id: details.deviceId,
        location: details.location,
        merchant_category: details.merchantCategory,
        if_score: anomalyResult.ifScore,
        ahc_result: anomalyResult.ahcResult,
        confidence: anomalyResult.confidence,
        sequential_model: true,
      },
      score: anomalyResult.score,
      threshold: anomalyResult.threshold,
      is_anomaly: anomalyResult.isAnomaly,
      model_version: anomalyResult.modelVersion,
      created_at: new Date().toISOString(),
    })

    if (anomalyLogError) {
      console.error("Anomaly log creation error:", anomalyLogError)
      // We don't throw here as this is not critical for the payment process
    }

    // After creating the transaction and anomaly log, update the dashboard stats
    try {
      console.log("Updating dashboard stats for user:", effectiveUserId)
      const { data, error } = await supabase.rpc("update_dashboard_stats", {
        user_id_param: effectiveUserId,
      })

      if (error) {
        console.error("Error from update_dashboard_stats RPC:", error)
      } else {
        console.log("Dashboard stats updated successfully")
      }
    } catch (updateStatsError) {
      console.error("Error updating dashboard stats:", updateStatsError)
      // Non-critical error, don't throw
    }

    // Train the model with the new transaction data
    // This would typically be done in a background job, but for simplicity we'll do it here
    const { data: allTransactions } = await supabase.from("transactions").select(`
        amount,
        created_at,
        user_id,
        anomaly_score,
        is_flagged,
        anomaly_logs(features)
      `)

    if (allTransactions && allTransactions.length > 10) {
      // Convert to the format expected by the model
      const trainingData = allTransactions.map((tx) => {
        const features = tx.anomaly_logs?.[0]?.features || {}
        return {
          amount: tx.amount,
          userId: tx.user_id,
          timeOfDay: features.time_of_day || 12,
          dayOfWeek: features.day_of_week || 3,
          userTransactionCount: features.user_transaction_count || 0,
          userAverageAmount: features.user_average_amount || 0,
          transactionVelocity: features.transaction_velocity || 0,
          isNewPaymentMethod: features.is_new_payment_method || false,
          isInternational: features.is_international || false,
          isHighRiskCountry: features.is_high_risk_country || false,
          merchantCategory: features.merchant_category,
        }
      })

      // Train in the background
      trainModel(trainingData).catch(console.error)
    }

    return {
      success: true,
      transactionId: transactionId,
      flagged: anomalyResult.isAnomaly,
      riskFactors: anomalyResult.riskFactors,
      confidence: anomalyResult.confidence,
      ifScore: anomalyResult.ifScore,
      ahcResult: anomalyResult.ahcResult,
    }
  } catch (error: any) {
    console.error("Payment processing error:", error)
    return {
      success: false,
      error: error.message || "An error occurred while processing the payment",
    }
  }
}
