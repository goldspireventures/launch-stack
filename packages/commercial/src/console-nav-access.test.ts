import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONSOLE_ROUTE_CAPABILITY,
  consoleRouteAllowed,
  filterConsoleNavItems,
} from './console-nav-access';

describe('consoleRouteAllowed', () => {
  it('owner can reach gated routes', () => {
    for (const href of Object.keys(CONSOLE_ROUTE_CAPABILITY)) {
      assert.equal(consoleRouteAllowed('STUDIO_OWNER', href), true, href);
    }
  });

  it('staff cannot reach owner-only routes', () => {
    assert.equal(consoleRouteAllowed('STUDIO_STAFF', '/reports'), false);
    assert.equal(consoleRouteAllowed('STUDIO_STAFF', '/commercial'), false);
    assert.equal(consoleRouteAllowed('STUDIO_STAFF', '/onboard'), false);
    assert.equal(consoleRouteAllowed('STUDIO_STAFF', '/lab'), false);
    assert.equal(consoleRouteAllowed('STUDIO_STAFF', '/deals'), true);
  });

  it('filterConsoleNavItems drops restricted hrefs', () => {
    const items = [
      { href: '/deals', label: 'Deals' },
      { href: '/reports', label: 'Reports' },
    ] as const;
    const filtered = filterConsoleNavItems('STUDIO_STAFF', items);
    assert.deepEqual(filtered.map((i) => i.href), ['/deals']);
  });
});
