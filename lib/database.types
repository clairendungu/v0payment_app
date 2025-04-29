export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          card_last_four: string
          card_brand: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_last_four: string
          card_brand: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_last_four?: string
          card_brand?: string
          is_default?: boolean
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          payment_method_id: string | null
          amount: number
          currency: string
          status: string
          description: string | null
          anomaly_score: number | null
          is_flagged: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          payment_method_id?: string | null
          amount: number
          currency?: string
          status: string
          description?: string | null
          anomaly_score?: number | null
          is_flagged?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          payment_method_id?: string | null
          amount?: number
          currency?: string
          status?: string
          description?: string | null
          anomaly_score?: number | null
          is_flagged?: boolean
          created_at?: string
        }
      }
      anomaly_logs: {
        Row: {
          id: string
          transaction_id: string
          features: Json
          score: number
          threshold: number
          is_anomaly: boolean
          model_version: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          features: Json
          score: number
          threshold: number
          is_anomaly: boolean
          model_version?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          features?: Json
          score?: number
          threshold?: number
          is_anomaly?: boolean
          model_version?: string | null
          created_at?: string
        }
      }
      dashboard_stats: {
        Row: {
          id: string
          user_id: string
          total_transactions: number
          total_amount: number
          avg_amount: number
          flagged_transactions: number
          completed_transactions: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_transactions?: number
          total_amount?: number
          avg_amount?: number
          flagged_transactions?: number
          completed_transactions?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_transactions?: number
          total_amount?: number
          avg_amount?: number
          flagged_transactions?: number
          completed_transactions?: number
          updated_at?: string
        }
      }
    }
  }
}
