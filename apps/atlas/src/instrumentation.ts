export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const [{ initSentry }, { collectProductionConfigIssues }] = await Promise.all([
    import('@goldspire/platform/sentry'),
    import('@goldspire/platform/production-guard'),
  ]);
  await initSentry();
  for (const issue of collectProductionConfigIssues()) {
    if (issue.severity === 'error') {
      console.error(`[production-guard] ${issue.code}: ${issue.message}`);
    }
  }
}
