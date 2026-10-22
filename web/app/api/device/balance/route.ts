import { NextRequest, NextResponse } from 'next/server';
import { hashToken } from '@/lib/crypto';
import { getBalances } from '@/lib/balance';
import connectDB from '@/lib/db';
import { Device } from '@/models';

// ESP32 专用接口，格式约定见 firmware/README.md
// 请求头：Authorization: Bearer dev_xxx
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await connectDB();
  const device = await Device.findOneAndUpdate(
    { tokenHash: hashToken(token) },
    { lastSeenAt: new Date() },
  );
  if (!device) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const balances = await getBalances(5 * 60_000);

  // 字段尽量少、尽量扁平，方便单片机用 ArduinoJson 解析
  return NextResponse.json({
    t: Math.floor(Date.now() / 1000),
    items: balances.flatMap((b) =>
      b.items.map((i) => ({
        p: b.provider,
        cur: i.currency,
        total: i.total,
        ok: b.available,
        stale: b.stale,
      })),
    ),
  });
}
