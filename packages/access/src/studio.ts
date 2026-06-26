import type { StudioConsoleCapability } from './capabilities';
import { STUDIO_CONSOLE_CAPABILITIES } from './capabilities';

/** @deprecated Import from @goldspire/access — kept for commercial re-exports. */
export function studioConsoleCapabilities(role: string): readonly StudioConsoleCapability[] {
  if (role === 'STUDIO_OWNER') return STUDIO_CONSOLE_CAPABILITIES.STUDIO_OWNER;
  if (role === 'STUDIO_STAFF') return STUDIO_CONSOLE_CAPABILITIES.STUDIO_STAFF;
  return [];
}

export function studioHasCapability(role: string, cap: StudioConsoleCapability): boolean {
  return studioConsoleCapabilities(role).includes(cap);
}
