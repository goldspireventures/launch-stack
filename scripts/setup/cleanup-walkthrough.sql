DELETE FROM studio_deal_payment_line
WHERE deal_id IN (
  SELECT id FROM studio_deal
  WHERE title IN ('Walkthrough — Heartline clone', 'Walkthrough — Medium template build')
     OR client_name IN ('Walkthrough Clone Co', 'Walkthrough Medium Co')
);

DELETE FROM studio_deal
WHERE title IN ('Walkthrough — Heartline clone', 'Walkthrough — Medium template build')
   OR client_name IN ('Walkthrough Clone Co', 'Walkthrough Medium Co');

DELETE FROM "user"
WHERE email IN ('walkthrough-clone@goldspire.dev', 'walkthrough-medium@goldspire.dev');
