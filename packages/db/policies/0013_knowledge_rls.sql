-- Knowledge / Atlas tables — tenant isolation + studio bypass

ALTER TABLE knowledge_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunk ENABLE ROW LEVEL SECURITY;
ALTER TABLE atlas_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE atlas_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_index_run ENABLE ROW LEVEL SECURITY;

-- Studio sees all; tenant users see global studio corpora chunks (tenant_id null)
-- and their tenant's tenant.product chunks.

CREATE POLICY knowledge_document_select ON knowledge_document
  FOR SELECT
  USING (
    app_is_studio()
    OR tenant_id IS NULL
    OR tenant_id = app_current_tenant()
  );

CREATE POLICY knowledge_document_write ON knowledge_document
  FOR ALL
  USING (app_is_studio())
  WITH CHECK (app_is_studio());

CREATE POLICY knowledge_chunk_select ON knowledge_chunk
  FOR SELECT
  USING (
    app_is_studio()
    OR tenant_id IS NULL
    OR tenant_id = app_current_tenant()
  );

CREATE POLICY knowledge_chunk_write ON knowledge_chunk
  FOR ALL
  USING (app_is_studio())
  WITH CHECK (app_is_studio());

CREATE POLICY atlas_session_select ON atlas_session
  FOR SELECT
  USING (
    app_is_studio()
    OR (tenant_id = app_current_tenant() AND user_id = app_current_user())
  );

CREATE POLICY atlas_session_write ON atlas_session
  FOR ALL
  USING (
    app_is_studio()
    OR (tenant_id = app_current_tenant() AND user_id = app_current_user())
  )
  WITH CHECK (
    app_is_studio()
    OR (tenant_id = app_current_tenant() AND user_id = app_current_user())
  );

CREATE POLICY atlas_message_select ON atlas_message
  FOR SELECT
  USING (
    app_is_studio()
    OR tenant_id = app_current_tenant()
  );

CREATE POLICY atlas_message_write ON atlas_message
  FOR ALL
  USING (
    app_is_studio()
    OR tenant_id = app_current_tenant()
  )
  WITH CHECK (
    app_is_studio()
    OR tenant_id = app_current_tenant()
  );

CREATE POLICY knowledge_index_run_studio ON knowledge_index_run
  FOR ALL
  USING (app_is_studio())
  WITH CHECK (app_is_studio());
