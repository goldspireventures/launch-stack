export * from './server';
/** Persona cookie handlers use `next/server` — import from `@goldspire/auth/persona-server` in Next route handlers only. */
export { PERSONA_COOKIE, PERSONAS, getPersonaById, getPersonaByEmail, listPersonasByGroup } from '@goldspire/config';
export type { PersonaDefinition, PersonaId, PersonaSurface } from '@goldspire/config';
