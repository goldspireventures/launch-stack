import { redirect } from 'next/navigation';

/** @deprecated Use `/moderation` — kept so old bookmarks keep working. */
export default function LegacyReportsRedirect() {
  redirect('/moderation');
}
