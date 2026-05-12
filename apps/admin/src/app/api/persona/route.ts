import { clearPersona, pickPersona } from '@goldspire/auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; next?: string | null };
  return pickPersona(body);
}

export async function DELETE() {
  return clearPersona();
}
