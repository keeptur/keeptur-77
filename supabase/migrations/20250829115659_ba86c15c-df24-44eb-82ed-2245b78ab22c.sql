-- One-time merge of duplicate subscribers for bradpitty
UPDATE subscribers 
SET 
  user_id = (SELECT user_id FROM subscribers WHERE email = 'bradpitty@monde.com.br'),
  updated_at = now()
WHERE email LIKE 'bradpitty@%' AND email != 'bradpitty@monde.com.br';

-- Delete non-Monde duplicates after merging data
DELETE FROM subscribers 
WHERE email LIKE 'bradpitty@%' AND email != 'bradpitty@monde.com.br';