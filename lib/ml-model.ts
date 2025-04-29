// Advanced ML model for fraud detection
// In a real application, this would be a trained model or API call to a model endpoint
import { FraudDetectionModel } from "./ml/combined-model"
import type { TransactionFeatureVector } from "./ml/isolation-forest"

// Define the structure of transaction features for our model
export type TransactionFeatures = {
  amount: number
  userId: string
  paymentMethodId?: string | null
  timeOfDay: number // Hour of day (0-23)
  dayOfWeek: number // Day of week (0-6)
  userTransactionCount: number
  userAverageAmount: number
  userTransactionFrequency?: number // Transactions per day
  transactionVelocity?: number // Number of transactions in last hour
  ipAddress?: string
  deviceId?: string
  location?: {
    country?: string
    city?: string
    latitude?: number
    longitude?: number
  }
  merchantCategory?: string
  isNewPaymentMethod?: boolean
  isInternational?: boolean
  isHighRiskCountry?: boolean
}

export type AnomalyResult = {
  score: number
  threshold: number
  isAnomaly: boolean
  modelVersion: string
  riskFactors: string[]
  confidence: number
  ifScore: number
  ahcResult: boolean
}

// Constants for our model
const MODEL_VERSION = "2.0.0"
const DEFAULT_THRESHOLD = 0.65
const IF_THRESHOLD = 0.5 // Threshold for Isolation Forest
const HIGH_RISK_COUNTRIES = ["XX", "YY", "ZZ"] // Example high-risk countries
const HIGH_RISK_MERCHANTS = ["gambling", "cryptocurrency", "adult", "money_transfer"]

// Global model instance (will be trained with historical data)
let fraudModel: FraudDetectionModel | null = null

// Feature names for our model
const FEATURE_NAMES = [
  "amount",
  "timeOfDay",
  "dayOfWeek",
  "userTransactionCount",
  "userAverageAmount",
  "transactionVelocity",
  "isNewPaymentMethod",
  "isInternational",
  "isHighRiskCountry",
  "merchantCategoryRisk",
]

// Convert transaction features to feature vector
function featuresToVector(features: TransactionFeatures): TransactionFeatureVector {
  // Calculate merchant category risk
  const merchantCategoryRisk =
    features.merchantCategory && HIGH_RISK_MERCHANTS.includes(features.merchantCategory) ? 1.0 : 0.0

  return {
    amount: features.amount,
    timeOfDay: features.timeOfDay,
    dayOfWeek: features.dayOfWeek,
    userTransactionCount: features.userTransactionCount,
    userAverageAmount: features.userAverageAmount,
    transactionVelocity: features.transactionVelocity || 0,
    isNewPaymentMethod: features.isNewPaymentMethod ? 1 : 0,
    isInternational: features.isInternational ? 1 : 0,
    isHighRiskCountry: features.isHighRiskCountry ? 1 : 0,
    merchantCategoryRisk,
  }
}

// Train the model with historical transaction data
export async function trainModel(historicalTransactions: TransactionFeatures[]): Promise<void> {
  // Convert features to vectors
  const featureVectors = historicalTransactions.map(featuresToVector)

  // Initialize the model if needed
  if (!fraudModel) {
    fraudModel = new FraudDetectionModel(FEATURE_NAMES, DEFAULT_THRESHOLD, IF_THRESHOLD)
  }

  // Train the model
  await fraudModel.train(featureVectors)

  console.log("Fraud detection model trained successfully")
}

// Detect anomalies in a transaction
export async function detectAnomaly(features: TransactionFeatures): Promise<AnomalyResult> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Initialize model if needed (with a simple default model)
  if (!fraudModel) {
    fraudModel = new FraudDetectionModel(FEATURE_NAMES, DEFAULT_THRESHOLD, IF_THRESHOLD)

    // Create some synthetic data for initial training
    const syntheticData: TransactionFeatureVector[] = []
    for (let i = 0; i < 100; i++) {
      syntheticData.push({
        amount: Math.random() * 500,
        timeOfDay: Math.floor(Math.random() * 24),
        dayOfWeek: Math.floor(Math.random() * 7),
        userTransactionCount: Math.floor(Math.random() * 20),
        userAverageAmount: Math.random() * 300,
        transactionVelocity: Math.random() * 3,
        isNewPaymentMethod: Math.random() > 0.8 ? 1 : 0,
        isInternational: Math.random() > 0.9 ? 1 : 0,
        isHighRiskCountry: Math.random() > 0.95 ? 1 : 0,
        merchantCategoryRisk: Math.random() > 0.9 ? 1 : 0,
      })
    }

    // Add a few anomalies
    for (let i = 0; i < 10; i++) {
      syntheticData.push({
        amount: Math.random() * 5000 + 1000,
        timeOfDay: Math.floor(Math.random() * 6),
        dayOfWeek: 6,
        userTransactionCount: Math.floor(Math.random() * 3),
        userAverageAmount: Math.random() * 100,
        transactionVelocity: Math.random() * 10,
        isNewPaymentMethod: 1,
        isInternational: 1,
        isHighRiskCountry: Math.random() > 0.5 ? 1 : 0,
        merchantCategoryRisk: 1,
      })
    }

    await fraudModel.train(syntheticData)
  }

  // Convert features to vector
  const featureVector = featuresToVector(features)

  // Get prediction from model
  const result = fraudModel.predict(featureVector)

  return {
    score: result.score,
    threshold: DEFAULT_THRESHOLD,
    isAnomaly: result.isAnomaly,
    modelVersion: MODEL_VERSION,
    riskFactors: result.riskFactors,
    confidence: result.confidence,
    ifScore: result.ifScore,
    ahcResult: result.ahcResult,
  }
}
