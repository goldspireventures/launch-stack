import AsyncStorage from '@react-native-async-storage/async-storage';
import { PERSONA_COOKIE, PERSONAS, type PersonaId } from '@goldspire/config';

const STORAGE_KEY = 'goldspire_persona';

export type { PersonaId };

export const DEFAULT_MOBILE_PERSONA: PersonaId = 'heartline.customer.sarah';

export async function getStoredPersonaId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function setStoredPersonaId(id: PersonaId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, id);
}

export function personaCookieHeader(personaId: string | null): Record<string, string> {
  if (!personaId) return {};
  return { Cookie: `${PERSONA_COOKIE}=${personaId}` };
}

export const MOBILE_PERSONAS = PERSONAS.filter((p) => p.tenantSlug === 'heartline' && p.group === 'customer');
