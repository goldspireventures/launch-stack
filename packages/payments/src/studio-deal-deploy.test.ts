import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateDeployWebhookSecret,
  sha256HexUtf8,
  timingSafeEqualHex,
} from './studio-deal-deploy-crypto';

describe('sha256HexUtf8', () => {
  it('matches known vector', () => {
    assert.equal(sha256HexUtf8('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('is 64 lowercase hex chars', () => {
    const h = sha256HexUtf8('gsdp_test');
    assert.match(h, /^[0-9a-f]{64}$/);
  });
});

describe('timingSafeEqualHex', () => {
  it('returns true for equal hex strings', () => {
    const a = 'ab'.repeat(32);
    const b = 'ab'.repeat(32);
    assert.equal(timingSafeEqualHex(a, b), true);
  });

  it('returns false for different hex', () => {
    const a = '0'.repeat(64);
    const b = 'f'.repeat(64);
    assert.equal(timingSafeEqualHex(a, b), false);
  });

  it('returns false for length mismatch', () => {
    assert.equal(timingSafeEqualHex('aa', 'aa00'), false);
  });

  it('returns false for invalid hex', () => {
    assert.equal(timingSafeEqualHex('zz' + '0'.repeat(62), '0'.repeat(64)), false);
  });
});

describe('generateDeployWebhookSecret', () => {
  it('prefixes gsdp_', () => {
    const s = generateDeployWebhookSecret();
    assert.ok(s.startsWith('gsdp_'));
    assert.match(s, /^gsdp_[A-Za-z0-9_-]+$/);
  });

  it('produces unique values', () => {
    const a = generateDeployWebhookSecret();
    const b = generateDeployWebhookSecret();
    assert.notEqual(a, b);
  });
});

describe('deploy auth round-trip', () => {
  it('stored hash matches header secret via sha256 + timingSafeEqualHex', () => {
    const raw = generateDeployWebhookSecret();
    const stored = sha256HexUtf8(raw);
    assert.equal(timingSafeEqualHex(stored, sha256HexUtf8(raw)), true);
    assert.equal(timingSafeEqualHex(stored, sha256HexUtf8(`${raw}x`)), false);
  });
});
