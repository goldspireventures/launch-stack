-- JIT support access: studio requests, client approves, time-bound audited sessions.

CREATE TABLE IF NOT EXISTS "support_access_request" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(26) NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "requested_by_user_id" varchar(26) NOT NULL,
  "reason" text NOT NULL,
  "scope" varchar(32) NOT NULL,
  "duration_minutes" integer NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "decided_by_user_id" varchar(26),
  "decided_at" timestamptz,
  "denial_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "support_access_request_tenant_status_ix"
  ON "support_access_request" ("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "support_access_session" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "request_id" varchar(26) NOT NULL REFERENCES "support_access_request"("id") ON DELETE CASCADE,
  "tenant_id" varchar(26) NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "studio_user_id" varchar(26) NOT NULL,
  "scope" varchar(32) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "support_access_session_tenant_active_ix"
  ON "support_access_session" ("tenant_id", "expires_at");

CREATE INDEX IF NOT EXISTS "support_access_session_studio_ix"
  ON "support_access_session" ("studio_user_id", "expires_at");
