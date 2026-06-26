CREATE TABLE IF NOT EXISTS "knowledge_document" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "corpus_id" varchar(40) NOT NULL,
  "tenant_id" varchar(26),
  "source_type" varchar(24) NOT NULL,
  "source_path" text NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "content_hash" varchar(64) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "knowledge_chunk" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "document_id" varchar(26) NOT NULL,
  "corpus_id" varchar(40) NOT NULL,
  "tenant_id" varchar(26),
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "embedding" jsonb,
  "token_estimate" integer,
  "heading" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "atlas_session" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "user_id" varchar(26) NOT NULL,
  "tenant_id" varchar(26) NOT NULL,
  "title" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "atlas_message" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "session_id" varchar(26) NOT NULL,
  "tenant_id" varchar(26) NOT NULL,
  "role" varchar(16) NOT NULL,
  "content" text NOT NULL,
  "citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "model" varchar(60),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "knowledge_index_run" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "triggered_by_user_id" varchar(26),
  "status" varchar(20) DEFAULT 'running' NOT NULL,
  "documents_processed" integer DEFAULT 0 NOT NULL,
  "chunks_written" integer DEFAULT 0 NOT NULL,
  "error" text,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_document_id_knowledge_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_document"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "atlas_session" ADD CONSTRAINT "atlas_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "atlas_session" ADD CONSTRAINT "atlas_session_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "atlas_message" ADD CONSTRAINT "atlas_message_session_id_atlas_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."atlas_session"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "atlas_message" ADD CONSTRAINT "atlas_message_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "knowledge_index_run" ADD CONSTRAINT "knowledge_index_run_triggered_by_user_id_user_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "knowledge_document_corpus_ix" ON "knowledge_document" ("corpus_id");
CREATE INDEX IF NOT EXISTS "knowledge_document_path_ix" ON "knowledge_document" ("source_path");
CREATE INDEX IF NOT EXISTS "knowledge_document_tenant_ix" ON "knowledge_document" ("tenant_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunk_document_ix" ON "knowledge_chunk" ("document_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunk_corpus_ix" ON "knowledge_chunk" ("corpus_id");
CREATE INDEX IF NOT EXISTS "atlas_session_user_created_ix" ON "atlas_session" ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "atlas_message_session_created_ix" ON "atlas_message" ("session_id","created_at");
CREATE INDEX IF NOT EXISTS "knowledge_index_run_started_ix" ON "knowledge_index_run" ("started_at");
