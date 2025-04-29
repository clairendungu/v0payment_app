/**
 * Combined ML model using Isolation Forest followed by AHC for fraud detection
 * The algorithms execute sequentially, with Isolation Forest results feeding into AHC
 */

import { IsolationForest, type TransactionFeatureVector } from "./isolation-forest"
import { AgglomerativeHierarchicalClustering } from "./ahc"

export interface ModelResult {
  isAnomaly: boolean
  score: number
  ifScore: number // Isolation Forest score
  ahcResult: boolean // AHC result
  confidence: number
  riskFactors: string[]
}

export class FraudDetectionModel {
  private isolationForest: IsolationForest
  private ahc: AgglomerativeHierarchicalClustering
  private featureNames: string[]
  private threshold: number
  private ifThreshold: number // Threshold for Isolation Forest
  private trained = false
  private historicalData: TransactionFeatureVector[] = []

  constructor(featureNames: string[] = [], threshold = 0.65, ifThreshold = 0.5) {
    this.featureNames = featureNames
    this.threshold = threshold
    this.ifThreshold = ifThreshold

    // Initialize models
    this.isolationForest = new IsolationForest(
      100, // nTrees
      256, // maxSamples
      8, // maxDepth
      0.1, // contamination
      featureNames,
    )

    this.ahc = new AgglomerativeHierarchicalClustering(
      5, // nClusters
      2.0, // anomalyThreshold
      featureNames,
    )
  }

  // Train the model on a dataset
  async train(data: TransactionFeatureVector[]): Promise<void> {
    if (data.length < 10) {
      console.warn("Not enough data to train the model effectively")
      return
    }

    // Store historical data for retraining
    this.historicalData = [...this.historicalData, ...data]

    // Train Isolation Forest on all data
    this.isolationForest.fit(this.historicalData)

    // Get Isolation Forest scores for all transactions
    const ifScores = this.isolationForest.decisionScores(this.historicalData)

    // Select potential anomalies based on Isolation Forest scores
    const potentialAnomalies: TransactionFeatureVector[] = []
    const potentialAnomalyIndices: number[] = []

    this.historicalData.forEach((transaction, index) => {
      if (ifScores[index] > this.ifThreshold) {
        potentialAnomalies.push(transaction)
        potentialAnomalyIndices.push(index)
      }
    })

    // If we have enough potential anomalies, train AHC on them
    if (potentialAnomalies.length >= 5) {
      this.ahc.fit(potentialAnomalies)
    } else {
      // If not enough potential anomalies, train AHC on all data
      console.warn("Not enough potential anomalies found, training AHC on all data")
      this.ahc.fit(this.historicalData)
    }

    this.trained = true
    console.log(
      `Model trained with ${this.historicalData.length} transactions, ${potentialAnomalies.length} potential anomalies`,
    )
  }

  // Predict if a transaction is fraudulent
  predict(transaction: TransactionFeatureVector): ModelResult {
    if (!this.trained) {
      throw new Error("Model has not been trained yet")
    }

    // Step 1: Get Isolation Forest score
    const ifResult = this.isolationForest.predictWithScores([transaction])[0]

    // Step 2: If IF score is above threshold, check with AHC
    let ahcResult = false
    if (ifResult.score > this.ifThreshold) {
      // Only run AHC if Isolation Forest flags it as suspicious
      ahcResult = this.ahc.predict([transaction])[0]
    }

    // Step 3: Calculate final score
    // If IF score is high but AHC says it's not an anomaly, reduce the score
    // If both agree it's an anomaly, increase the score
    let finalScore = ifResult.score
    if (ifResult.score > this.ifThreshold) {
      if (ahcResult) {
        // Both algorithms agree it's an anomaly, increase confidence
        finalScore = Math.min(1, ifResult.score * 1.2)
      } else {
        // IF thinks it's an anomaly but AHC disagrees, reduce confidence
        finalScore = ifResult.score * 0.8
      }
    }

    const isAnomaly = finalScore > this.threshold

    // Calculate confidence based on how far the score is from the threshold
    const confidence = Math.min(1, Math.abs(finalScore - this.threshold) * 2)

    // Generate risk factors
    const riskFactors = this.generateRiskFactors(transaction, ifResult.score, ahcResult)

    return {
      isAnomaly,
      score: finalScore,
      ifScore: ifResult.score,
      ahcResult,
      confidence,
      riskFactors,
    }
  }

  // Generate risk factors based on the transaction features
  private generateRiskFactors(transaction: TransactionFeatureVector, ifScore: number, ahcAnomaly: boolean): string[] {
    const riskFactors: string[] = []

    // Add algorithm-specific factors
    if (ifScore > 0.8) {
      riskFactors.push("High isolation score (rare transaction pattern)")
    }

    if (ahcAnomaly) {
      riskFactors.push("Transaction belongs to a small or distant cluster")
    }

    // Add feature-specific factors
    if (transaction.amount > 1000) {
      riskFactors.push("Unusually high transaction amount")
    }

    if (transaction.timeOfDay < 6 || transaction.timeOfDay > 22) {
      riskFactors.push("Transaction at unusual hours")
    }

    if (transaction.userTransactionCount < 5) {
      riskFactors.push("New user account with few transactions")
    }

    if (transaction.transactionVelocity > 3) {
      riskFactors.push("Multiple transactions in short time period")
    }

    if (transaction.isNewPaymentMethod) {
      riskFactors.push("New payment method")
    }

    if (transaction.isInternational) {
      riskFactors.push("International transaction")
    }

    if (transaction.isHighRiskCountry) {
      riskFactors.push("Transaction from high-risk country")
    }

    return riskFactors
  }

  // Get the feature importance (simplified version)
  getFeatureImportance(): Record<string, number> {
    // This is a simplified approximation since true feature importance
    // would require more complex calculations
    return {
      amount: 0.25,
      timeOfDay: 0.1,
      dayOfWeek: 0.05,
      userTransactionCount: 0.15,
      userAverageAmount: 0.15,
      transactionVelocity: 0.1,
      isNewPaymentMethod: 0.1,
      isInternational: 0.05,
      isHighRiskCountry: 0.05,
    }
  }
}
