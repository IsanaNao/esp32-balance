import { NextRequest } from 'next/server';

// Vercel 会把真实客户端 IP 放在 x-forwarded-for 的第一个
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
