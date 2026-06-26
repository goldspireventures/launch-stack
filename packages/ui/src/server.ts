/**
 * Server-only exports — import from `@goldspire/ui/server` in Route Handlers.
 * Do not re-export from the main `@goldspire/ui` entry (client bundles must not pull this in).
 */
export { handleClientErrorReport } from './components/client-error-route-handler';
