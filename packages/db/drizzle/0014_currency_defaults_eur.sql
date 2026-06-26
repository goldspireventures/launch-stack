-- Standardize new-row currency defaults to EUR (product policy).
ALTER TABLE "studio_deal" ALTER COLUMN "currency" SET DEFAULT 'EUR';
ALTER TABLE "studio_deal_payment_line" ALTER COLUMN "currency" SET DEFAULT 'EUR';
ALTER TABLE "business" ALTER COLUMN "currency" SET DEFAULT 'EUR';
ALTER TABLE "listing" ALTER COLUMN "currency" SET DEFAULT 'EUR';
ALTER TABLE "order" ALTER COLUMN "currency" SET DEFAULT 'EUR';
ALTER TABLE "space" ALTER COLUMN "currency" SET DEFAULT 'EUR';
