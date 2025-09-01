-- Check current policies on subscribers table
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'subscribers' 
ORDER BY policyname;