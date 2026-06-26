import { registerStudioKickoffPaidHandler } from '@goldspire/payments';
import { tryAutoStampTenantAfterKickoffPayment } from './lib/auto-stamp-from-deal';

registerStudioKickoffPaidHandler(async ({ db, dealId }) => {
  await tryAutoStampTenantAfterKickoffPayment({ db, dealId });
});
