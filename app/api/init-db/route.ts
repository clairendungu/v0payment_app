import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerClient()

  // Add more detailed logging
  console.log("Starting database initialization")

  try {
    // Check if users table exists
    const { data: usersCheck, error: usersError } = await supabase.from("users").select("count").limit(1)

    if (usersError) {
      console.error("Error checking users table:", usersError)

      // Try to create the tables
      await supabase.query(`
        -- Create extension for UUID generation if it doesn't exist
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Create users table if not exists
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          full_name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create payment_methods table if not exists
        CREATE TABLE IF NOT EXISTS payment_methods (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id),
          card_last_four TEXT NOT NULL,
          card_brand TEXT NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create transactions table if not exists
        CREATE TABLE IF NOT EXISTS transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id),
          payment_method_id UUID REFERENCES payment_methods(id),
          amount DECIMAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          status TEXT NOT NULL,
          description TEXT,
          anomaly_score DECIMAL,
          is_flagged BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create anomaly_logs table if not exists
        CREATE TABLE IF NOT EXISTS anomaly_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          transaction_id UUID NOT NULL REFERENCES transactions(id),
          features JSONB NOT NULL,
          score DECIMAL NOT NULL,
          threshold DECIMAL NOT NULL,
          is_anomaly BOOLEAN NOT NULL,
          model_version TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create dashboard_stats table if not exists
        CREATE TABLE IF NOT EXISTS dashboard_stats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
          total_transactions BIGINT NOT NULL DEFAULT 0,
          total_amount DECIMAL NOT NULL DEFAULT 0,
          avg_amount DECIMAL NOT NULL DEFAULT 0,
          flagged_transactions BIGINT NOT NULL DEFAULT 0,
          completed_transactions BIGINT NOT NULL DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create function for transaction stats
        CREATE OR REPLACE FUNCTION get_transaction_stats(user_id_param UUID)
        RETURNS TABLE (
          total_transactions BIGINT,
          total_amount DECIMAL,
          avg_amount DECIMAL,
          flagged_transactions BIGINT
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT
            COUNT(*)::BIGINT AS total_transactions,
            COALESCE(SUM(amount), 0) AS total_amount,
            COALESCE(AVG(amount), 0) AS avg_amount,
            COUNT(*) FILTER (WHERE is_flagged = true)::BIGINT AS flagged_transactions
          FROM
            transactions
          WHERE
            user_id = user_id_param;
        END;
        $$ LANGUAGE plpgsql;

        -- Create function to update dashboard stats
        CREATE OR REPLACE FUNCTION update_dashboard_stats(user_id_param UUID)
        RETURNS VOID AS $$
        DECLARE
          stats RECORD;
          completed_count BIGINT;
        BEGIN
          -- Get transaction stats
          SELECT 
            COUNT(*)::BIGINT AS total_transactions,
            COALESCE(SUM(amount), 0) AS total_amount,
            COALESCE(AVG(amount), 0) AS avg_amount,
            COUNT(*) FILTER (WHERE is_flagged = true)::BIGINT AS flagged_transactions
          INTO stats
          FROM transactions
          WHERE user_id = user_id_param;
          
          -- Get completed transactions count
          SELECT COUNT(*)::BIGINT INTO completed_count
          FROM transactions
          WHERE user_id = user_id_param AND status = 'completed';
          
          -- Insert or update dashboard stats
          INSERT INTO dashboard_stats (
            user_id, 
            total_transactions, 
            total_amount, 
            avg_amount, 
            flagged_transactions, 
            completed_transactions,
            updated_at
          )
          VALUES (
            user_id_param,
            stats.total_transactions,
            stats.total_amount,
            stats.avg_amount,
            stats.flagged_transactions,
            completed_count,
            NOW()
          )
          ON CONFLICT (user_id) 
          DO UPDATE SET
            total_transactions = EXCLUDED.total_transactions,
            total_amount = EXCLUDED.total_amount,
            avg_amount = EXCLUDED.avg_amount,
            flagged_transactions = EXCLUDED.flagged_transactions,
            completed_transactions = EXCLUDED.completed_transactions,
            updated_at = EXCLUDED.updated_at;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger to update dashboard stats after transaction changes
        CREATE OR REPLACE FUNCTION trigger_update_dashboard_stats()
        RETURNS TRIGGER AS $$
        BEGIN
          PERFORM update_dashboard_stats(NEW.user_id);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger on transactions table
        DROP TRIGGER IF EXISTS update_dashboard_stats_trigger ON transactions;
        CREATE TRIGGER update_dashboard_stats_trigger
        AFTER INSERT OR UPDATE ON transactions
        FOR EACH ROW
        EXECUTE FUNCTION trigger_update_dashboard_stats();
      `)

      return NextResponse.json({ success: true, message: "Database tables created" })
    }

    // Check if the function exists
    try {
      await supabase.rpc("get_transaction_stats", { user_id_param: "00000000-0000-0000-0000-000000000000" })
    } catch (functionError) {
      console.error("Error checking function, creating it:", functionError)

      // Create the function
      await supabase.query(`
        -- Create function for transaction stats
        CREATE OR REPLACE FUNCTION get_transaction_stats(user_id_param UUID)
        RETURNS TABLE (
          total_transactions BIGINT,
          total_amount DECIMAL,
          avg_amount DECIMAL,
          flagged_transactions BIGINT
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT
            COUNT(*)::BIGINT AS total_transactions,
            COALESCE(SUM(amount), 0) AS total_amount,
            COALESCE(AVG(amount), 0) AS avg_amount,
            COUNT(*) FILTER (WHERE is_flagged = true)::BIGINT AS flagged_transactions
          FROM
            transactions
          WHERE
            user_id = user_id_param;
        END;
        $$ LANGUAGE plpgsql;
      `)
    }

    try {
      // Check if dashboard_stats table exists
      const { data: statsCheck, error: statsError } = await supabase.from("dashboard_stats").select("count").limit(1)

      console.log("Stats table check:", statsCheck, statsError)

      // Test the update_dashboard_stats function
      // if (user?.id) { // user is not defined in this context, removing the check
      try {
        await supabase.rpc("update_dashboard_stats", { user_id_param: "00000000-0000-0000-0000-000000000000" })
        console.log("Successfully called update_dashboard_stats")
      } catch (functionError) {
        console.error("Error calling update_dashboard_stats:", functionError)
      }
      // }
    } catch (error) {
      console.error("Error during additional checks:", error)
    }

    return NextResponse.json({ success: true, message: "Database already set up" })
  } catch (error: any) {
    console.error("Failed to initialize database:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
