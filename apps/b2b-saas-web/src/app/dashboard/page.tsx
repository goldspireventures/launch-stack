import { redirect } from 'next/navigation';

/** Golden-path smoke route — workspace home lives at `/`. */
export default function DashboardPage() {
  redirect('/');
}
