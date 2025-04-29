/**
 * Isolation Forest implementation for anomaly detection
 *
 * This algorithm isolates observations by randomly selecting features
 * and then randomly selecting a split value between the maximum and minimum
 * values of the selected feature. Anomalies are typically isolated in fewer steps.
 */

// Define the structure of a node in the isolation tree
interface TreeNode {
  feature?: number
  threshold?: number
  left?: TreeNode
  right?: TreeNode
  size?: number
  depth: number
  isLeaf: boolean
}

// Define the structure of a transaction feature vector
export interface TransactionFeatureVector {
  [key: string]: number
}

export class IsolationForest {
  private trees: TreeNode[] = []
  private readonly nTrees: number
  private readonly maxSamples: number
  private readonly maxDepth: number
  private readonly featureNames: string[]
  private readonly contamination: number
  private threshold = 0

  constructor(nTrees = 100, maxSamples = 256, maxDepth = 8, contamination = 0.1, featureNames: string[] = []) {
    this.nTrees = nTrees
    this.maxSamples = maxSamples
    this.maxDepth = maxDepth
    this.contamination = contamination
    this.featureNames = featureNames
  }

  // Train the isolation forest on a dataset
  fit(X: TransactionFeatureVector[]): void {
    // Convert feature vectors to arrays of numbers
    const data = this.vectorsToArrays(X)

    // Build multiple isolation trees
    this.trees = []
    for (let i = 0; i < this.nTrees; i++) {
      // Sample data with replacement
      const sampledIndices = this.sampleWithReplacement(data.length, this.maxSamples)
      const sampledData = sampledIndices.map((idx) => data[idx])

      // Build a tree
      const tree = this.buildIsolationTree(sampledData, 0, this.maxDepth)
      this.trees.push(tree)
    }

    // Calculate anomaly scores for the training data
    const scores = this.decisionScores(X)

    // Set the threshold based on contamination
    const sortedScores = [...scores].sort((a, b) => a - b)
    const thresholdIdx = Math.floor((1 - this.contamination) * sortedScores.length)
    this.threshold = sortedScores[thresholdIdx]
  }

  // Convert feature vectors to arrays
  private vectorsToArrays(X: TransactionFeatureVector[]): number[][] {
    if (this.featureNames.length === 0) {
      // If no feature names provided, use all keys from the first vector
      this.featureNames.push(...Object.keys(X[0]))
    }

    return X.map((vector) => {
      return this.featureNames.map((feature) => vector[feature] || 0)
    })
  }

  // Sample indices with replacement
  private sampleWithReplacement(size: number, nSamples: number): number[] {
    const samples: number[] = []
    for (let i = 0; i < nSamples; i++) {
      samples.push(Math.floor(Math.random() * size))
    }
    return samples
  }

  // Build a single isolation tree
  private buildIsolationTree(X: number[][], depth: number, maxDepth: number): TreeNode {
    const nSamples = X.length
    const nFeatures = X[0].length

    // Return a leaf node if we've reached max depth or have 1 or fewer samples
    if (depth >= maxDepth || nSamples <= 1) {
      return {
        depth,
        isLeaf: true,
        size: nSamples,
      }
    }

    // Randomly select a feature
    const featureIdx = Math.floor(Math.random() * nFeatures)

    // Find min and max values for the selected feature
    let minVal = X[0][featureIdx]
    let maxVal = X[0][featureIdx]

    for (let i = 1; i < nSamples; i++) {
      minVal = Math.min(minVal, X[i][featureIdx])
      maxVal = Math.max(maxVal, X[i][featureIdx])
    }

    // If all values are the same, return a leaf node
    if (minVal === maxVal) {
      return {
        depth,
        isLeaf: true,
        size: nSamples,
      }
    }

    // Randomly select a threshold between min and max
    const threshold = minVal + Math.random() * (maxVal - minVal)

    // Split the data
    const leftData: number[][] = []
    const rightData: number[][] = []

    for (const sample of X) {
      if (sample[featureIdx] < threshold) {
        leftData.push(sample)
      } else {
        rightData.push(sample)
      }
    }

    // Create a split node
    return {
      feature: featureIdx,
      threshold,
      left: this.buildIsolationTree(leftData, depth + 1, maxDepth),
      right: this.buildIsolationTree(rightData, depth + 1, maxDepth),
      depth,
      isLeaf: false,
    }
  }

  // Calculate the path length for a single sample through a tree
  private pathLength(x: number[], tree: TreeNode, currentDepth = 0): number {
    // If we've reached a leaf node, return the depth adjustment
    if (tree.isLeaf) {
      return currentDepth + this.cFactor(tree.size || 1)
    }

    // Navigate left or right based on the feature value
    if (x[tree.feature!] < tree.threshold!) {
      return this.pathLength(x, tree.left!, currentDepth + 1)
    } else {
      return this.pathLength(x, tree.right!, currentDepth + 1)
    }
  }

  // Correction factor for average path length calculation
  private cFactor(size: number): number {
    if (size <= 1) return 0
    const H = Math.log(size) + 0.5772156649 // Euler's constant
    return 2 * H - (2 * (size - 1)) / size
  }

  // Calculate anomaly scores for a dataset
  decisionScores(X: TransactionFeatureVector[]): number[] {
    const data = this.vectorsToArrays(X)
    const scores: number[] = []

    for (const sample of data) {
      // Calculate average path length across all trees
      let totalPathLength = 0
      for (const tree of this.trees) {
        totalPathLength += this.pathLength(sample, tree)
      }
      const avgPathLength = totalPathLength / this.trees.length

      // Calculate anomaly score (higher is more anomalous)
      // 2^(-avgPathLength/c(n)) where c(n) is the average path length in a binary search tree
      const score = Math.pow(2, -avgPathLength / this.cFactor(this.maxSamples))
      scores.push(score)
    }

    return scores
  }

  // Predict if samples are anomalies
  predict(X: TransactionFeatureVector[]): boolean[] {
    const scores = this.decisionScores(X)
    return scores.map((score) => score > this.threshold)
  }

  // Get anomaly scores with prediction
  predictWithScores(X: TransactionFeatureVector[]): { isAnomaly: boolean; score: number }[] {
    const scores = this.decisionScores(X)
    return scores.map((score) => ({
      isAnomaly: score > this.threshold,
      score,
    }))
  }
}
