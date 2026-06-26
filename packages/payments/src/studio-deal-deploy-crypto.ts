import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256HexUtf8(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Raw secret for operators; store only `sha256HexUtf8(raw)` on the deal row. */
export function generateDeployWebhookSecret(): string {
  return `gsdp_${randomBytes(28).toString('base64url')}`;
}
