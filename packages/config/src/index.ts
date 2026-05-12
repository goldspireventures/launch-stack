/**
 * Barrel export for client-safe config constants.
 *
 * IMPORTANT: do NOT re-export from './env' here. The env module touches
 * server-only variables (DATABASE_URL, secrets, NODE_ENV, etc.) which
 * @t3-oss/env-core refuses to read in a browser context. Anything that
 * actually needs env values must import from '@goldspire/config/env'
 * (server / Node only). This file is safe to import from client code.
 */
export * from './brand';
export * from './roles';
export * from './entitlements';
export * from './events';
export * from './personas';
