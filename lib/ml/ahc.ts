/**
 * Agglomerative Hierarchical Clustering (AHC) implementation for anomaly detection
 *
 * This algorithm builds a hierarchy of clusters by merging the closest pairs of clusters
 * until a stopping criterion is met. For anomaly detection, we identify small or distant clusters.
 */

import type { TransactionFeatureVector } from "./isolation-forest"

// Define the structure of a cluster
interface Cluster {
  points: number[][]
  centroid: number[]
  size: number
  distanceToNearest?: number
}

export class AgglomerativeHierarchicalClustering {
  private clusters: Cluster[] = []
  private readonly nClusters: number
  private readonly anomalyThreshold: number
  private readonly featureNames: string[]
  private distanceMatrix: number[][] = []

  constructor(nClusters = 5, anomalyThreshold = 2.0, featureNames: string[] = []) {
    this.nClusters = nClusters
    this.anomalyThreshold = anomalyThreshold
    this.featureNames = featureNames
  }

  // Train the AHC model on a dataset
  fit(X: TransactionFeatureVector[]): void {
    // Convert feature vectors to arrays of numbers
    const data = this.vectorsToArrays(X)

    // Initialize each point as its own cluster
    this.clusters = data.map((point) => ({
      points: [point],
      centroid: [...point],
      size: 1,
    }))

    // Build distance matrix
    this.buildDistanceMatrix()

    // Merge clusters until we reach the desired number
    while (this.clusters.length > this.nClusters) {
      this.mergeClusters()
    }

    // Calculate distance to nearest cluster for each cluster
    this.calculateClusterDistances()
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

  // Build the distance matrix between all clusters
  private buildDistanceMatrix(): void {
    const n = this.clusters.length
    this.distanceMatrix = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const distance = this.calculateClusterDistance(this.clusters[i], this.clusters[j])
        this.distanceMatrix[i][j] = distance
        this.distanceMatrix[j][i] = distance
      }
    }
  }

  // Calculate distance between two clusters (using average linkage)
  private calculateClusterDistance(cluster1: Cluster, cluster2: Cluster): number {
    let totalDistance = 0

    for (const point1 of cluster1.points) {
      for (const point2 of cluster2.points) {
        totalDistance += this.euclideanDistance(point1, point2)
      }
    }

    return totalDistance / (cluster1.points.length * cluster2.points.length)
  }

  // Calculate Euclidean distance between two points
  private euclideanDistance(point1: number[], point2: number[]): number {
    let sum = 0
    for (let i = 0; i < point1.length; i++) {
      sum += Math.pow(point1[i] - point2[i], 2)
    }
    return Math.sqrt(sum)
  }

  // Find and merge the closest pair of clusters
  private mergeClusters(): void {
    let minDistance = Number.POSITIVE_INFINITY
    let minI = -1
    let minJ = -1

    // Find the closest pair of clusters
    for (let i = 0; i < this.clusters.length; i++) {
      for (let j = i + 1; j < this.clusters.length; j++) {
        if (this.distanceMatrix[i][j] < minDistance) {
          minDistance = this.distanceMatrix[i][j]
          minI = i
          minJ = j
        }
      }
    }

    if (minI === -1 || minJ === -1) return

    // Merge the clusters
    const cluster1 = this.clusters[minI]
    const cluster2 = this.clusters[minJ]

    const mergedPoints = [...cluster1.points, ...cluster2.points]
    const mergedSize = cluster1.size + cluster2.size

    // Calculate new centroid
    const centroid = Array(cluster1.centroid.length).fill(0)
    for (const point of mergedPoints) {
      for (let i = 0; i < point.length; i++) {
        centroid[i] += point[i]
      }
    }
    for (let i = 0; i < centroid.length; i++) {
      centroid[i] /= mergedPoints.length
    }

    // Create the merged cluster
    const mergedCluster: Cluster = {
      points: mergedPoints,
      centroid,
      size: mergedSize,
    }

    // Remove the original clusters and add the merged one
    this.clusters.splice(Math.max(minI, minJ), 1)
    this.clusters.splice(Math.min(minI, minJ), 1)
    this.clusters.push(mergedCluster)

    // Update distance matrix
    this.buildDistanceMatrix()
  }

  // Calculate the distance to the nearest cluster for each cluster
  private calculateClusterDistances(): void {
    for (let i = 0; i < this.clusters.length; i++) {
      let minDistance = Number.POSITIVE_INFINITY

      for (let j = 0; j < this.clusters.length; j++) {
        if (i !== j && this.distanceMatrix[i][j] < minDistance) {
          minDistance = this.distanceMatrix[i][j]
        }
      }

      this.clusters[i].distanceToNearest = minDistance
    }
  }

  // Predict if a sample is an anomaly
  predict(X: TransactionFeatureVector[]): boolean[] {
    const data = this.vectorsToArrays(X)
    const results: boolean[] = []

    for (const point of data) {
      // Find the closest cluster
      let minDistance = Number.POSITIVE_INFINITY
      let closestCluster: Cluster | null = null

      for (const cluster of this.clusters) {
        const distance = this.pointToClusterDistance(point, cluster)
        if (distance < minDistance) {
          minDistance = distance
          closestCluster = cluster
        }
      }

      if (!closestCluster) {
        results.push(true) // Consider as anomaly if no cluster found
        continue
      }

      // Check if the point is an anomaly
      // 1. If the cluster is small
      // 2. If the distance to the cluster is large compared to the cluster's internal distances
      const isSmallCluster = closestCluster.size < 3
      const isDistant = minDistance > (closestCluster.distanceToNearest || 0) * this.anomalyThreshold

      results.push(isSmallCluster || isDistant)
    }

    return results
  }

  // Calculate distance from a point to a cluster
  private pointToClusterDistance(point: number[], cluster: Cluster): number {
    let totalDistance = 0

    for (const clusterPoint of cluster.points) {
      totalDistance += this.euclideanDistance(point, clusterPoint)
    }

    return totalDistance / cluster.points.length
  }

  // Get the clusters
  getClusters(): Cluster[] {
    return this.clusters
  }
}
