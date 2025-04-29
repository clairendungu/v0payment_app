-- Function to get transaction statistics for a user
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
