import { redirect } from 'next/navigation';

/** Commercial plans live under Templates & pricing (single catalog surface). */
export default function StudioPlansRedirectPage() {
  redirect('/catalog/templates?tab=pricing');
}
