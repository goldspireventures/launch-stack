import { handleHttpHealth } from '@goldspire/api/http-health';

export async function GET() {
  return handleHttpHealth('atlas');
}
