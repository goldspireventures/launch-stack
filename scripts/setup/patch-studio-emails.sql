UPDATE "user"
SET email = REPLACE(email, '@goldspire.studio', '@goldspire.dev'),
    updated_at = NOW()
WHERE email LIKE '%@goldspire.studio';

SELECT email, role FROM "user" WHERE email LIKE '%@goldspire.dev' ORDER BY email;
