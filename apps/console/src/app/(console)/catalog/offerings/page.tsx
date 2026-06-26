import { redirect } from 'next/navigation';

/** Legacy URL — playbook content lives under Catalog → Templates → Scope & SKUs. */
export default function CatalogOfferingsRedirectPage() {
  redirect('/catalog/templates?tab=playbook');
}
