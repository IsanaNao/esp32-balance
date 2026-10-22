import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getBalances } from '@/lib/balance';

// PWA 查看余额。?refresh=1 时强制重新拉取（仍保留 30 秒下限，防止狂点）
export async function GET(req: NextRequest) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const refresh = req.nextUrl.searchParams.get('refresh') === '1';
  const balances = await getBalances(refresh ? 30_000 : 5 * 60_000);
  return NextResponse.json({ balances });
}
