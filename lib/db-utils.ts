import { createServerClient } from "./supabase-server"

export async function ensureDatabaseSetup() {
  const supabase = createServerClient()

  try {
    // Check if users table exists and has data
    const { data: usersCheck, error: usersError } = await supabase.from("users").select("count").limit(1).single()

    if (usersError) {
      console.error("Error checking users table:", usersError)

      // Try to create the tables
      await supabase.query(`
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
      `)

      console.log("Database tables created")
    }

    return true
  } catch (error) {
    console.error("Failed to ensure database setup:", error)
    return false
  }
}
