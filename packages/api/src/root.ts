import { router } from './trpc';
import { healthRouter } from './routers/health';
import { tenantsRouter } from './routers/tenants';
import { usersRouter } from './routers/users';
import { productsRouter } from './routers/products';
import { subscriptionsRouter } from './routers/subscriptions';
import { entitlementsRouter } from './routers/entitlements';
import { featureFlagsRouter } from './routers/feature-flags';
import { notificationsRouter } from './routers/notifications';
import { messagesRouter } from './routers/messages';
import { reportsRouter } from './routers/reports';
import { analyticsRouter } from './routers/analytics';
import { auditRouter } from './routers/audit';
import { catalogRouter } from './routers/catalog';
import { datingRouter } from './routers/dating';
import { onboardingRouter } from './routers/onboarding';
import { bookingRouter } from './routers/booking';
import { marketplaceRouter } from './routers/marketplace';
import { communityRouter } from './routers/community';
import { aiAgentRouter } from './routers/ai-agent';
import { deploymentsRouter } from './routers/deployments';
import { studioDealsRouter } from './routers/studio-deals';
import { studioRouter } from './routers/studio';
import { studioReportsRouter } from './routers/studio-reports';
import { studioAnalyticsRouter } from './routers/studio-analytics';

export const appRouter = router({
  health: healthRouter,
  tenants: tenantsRouter,
  users: usersRouter,
  products: productsRouter,
  deployments: deploymentsRouter,
  subscriptions: subscriptionsRouter,
  entitlements: entitlementsRouter,
  featureFlags: featureFlagsRouter,
  notifications: notificationsRouter,
  messages: messagesRouter,
  reports: reportsRouter,
  analytics: analyticsRouter,
  audit: auditRouter,
  catalog: catalogRouter,
  dating: datingRouter,
  onboarding: onboardingRouter,
  booking: bookingRouter,
  marketplace: marketplaceRouter,
  community: communityRouter,
  aiAgent: aiAgentRouter,
  studioDeals: studioDealsRouter,
  studio: studioRouter,
  studioReports: studioReportsRouter,
  studioAnalytics: studioAnalyticsRouter,
});

export type AppRouter = typeof appRouter;
