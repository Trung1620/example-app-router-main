// src/utils/getBaseUrl.ts
import { headers } from 'next/headers';

export async function getBaseUrl(): Promise<string> {
  const h = await headers(); // ✅ headers() giờ là Promise
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return '';
  return `${proto}://${host}`;
}
