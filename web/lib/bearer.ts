import { NextRequest } from 'next/server';

// 从 Authorization: Bearer xxx 里取出 xxx，没有就返回空字符串
export function getBearer(req: NextRequest): string {
  const auth = req.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}
