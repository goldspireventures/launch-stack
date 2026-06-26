CREATE TABLE IF NOT EXISTS "dating_user_block" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(26) NOT NULL REFERENCES "tenant"("id") ON DELETE cascade,
  "product_id" varchar(26) NOT NULL REFERENCES "product"("id") ON DELETE cascade,
  "blocker_user_id" varchar(26) NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "blocked_user_id" varchar(26) NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "dating_user_block_pair_uq" ON "dating_user_block" (
  "tenant_id",
  "blocker_user_id",
  "blocked_user_id"
);
