ALTER TABLE access_policy_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_policy_override_studio ON access_policy_override
  FOR ALL
  USING (app_is_studio())
  WITH CHECK (app_is_studio());
