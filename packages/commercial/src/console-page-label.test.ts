import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { consolePageLabel } from './console-page-label';

describe('consolePageLabel', () => {
  it('maps primary routes', () => {
    assert.equal(consolePageLabel('/'), 'Desk');
    assert.equal(consolePageLabel('/leads'), 'Enquiries');
    assert.equal(consolePageLabel('/deals'), 'Deals');
    assert.equal(consolePageLabel('/factory'), 'Clone factory');
    assert.equal(consolePageLabel('/catalog'), 'Catalog');
    assert.equal(consolePageLabel('/reference'), 'Reference');
  });

  it('maps detail routes', () => {
    assert.equal(consolePageLabel('/deals/01HNM9S49HY6CC31P21S4Y6K9M'), 'Deal');
    assert.equal(consolePageLabel('/tenants/acme'), 'Tenant');
  });
});
