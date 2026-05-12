import { handleClientErrorReport } from '@goldspire/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return handleClientErrorReport(req);
}
