import { handleClientErrorReport } from '@goldspire/ui/server';

export async function POST(req: Request) {
  return handleClientErrorReport(req);
}
