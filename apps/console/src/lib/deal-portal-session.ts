const PREFIX = 'gspl_portal_url:';

export function storeDealPortalUrl(dealId: string, url: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(`${PREFIX}${dealId}`, url);
  } catch {
    /* quota / private mode */
  }
}

export function readDealPortalUrl(dealId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(`${PREFIX}${dealId}`);
  } catch {
    return null;
  }
}

export const DEAL_POST_UPDATE_EVENT = 'goldspire:deal-post-update';

export function dispatchDealPostUpdate(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DEAL_POST_UPDATE_EVENT));
}
