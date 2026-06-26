#!/usr/bin/env node
import { loadRootEnv } from './setup/load-root-env.mjs';

loadRootEnv();

const dealId = process.argv[2] ?? '01HNM9S49HY6CC31P21S4Y6K9P';
const portalToken = process.argv[3] ?? 'gspl_goldspire_tier2_demo_26';
const base = (process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL ?? 'http://localhost:4005').replace(/\/$/, '');

const input = encodeURIComponent(
  JSON.stringify({
    '0': { json: { dealId, portalToken } },
  }),
);

const url = `${base}/api/trpc/portalDeals.summary?batch=1&input=${input}`;
const res = await fetch(url);
const text = await res.text();
console.log('status', res.status);
const json = JSON.parse(text);
const data = json[0]?.result?.data?.json;
console.log('deliveryPresetId', data?.deal?.deliveryPresetId);
console.log('deliverySignoffs', data?.deliverySignoffs);
