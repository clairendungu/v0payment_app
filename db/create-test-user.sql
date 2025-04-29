-- Create a test user if not exists
INSERT INTO users (id, email, full_name, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'Test User', NOW())
ON CONFLICT (id) DO NOTHING;
