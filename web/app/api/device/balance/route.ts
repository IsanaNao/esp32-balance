import { NextRequest, NextResponse } from 'next/server';
import { hashToken } from '@/lib/crypto';
import { getBearer } from '@/lib/bearer';
import { getBalances } from '@/lib/balance';
import { withDefaults, type DeviceSettings } from '@/lib/deviceSettings';
import connectDB from '@/lib/db';
import { Device } from '@/models';

// ESP32 专用接口，格式约定见 firmware/README.md
// 请求头：Authorization: Bearer dev_xxx
export async function GET(req: NextRequest) {
  const token = getBearer(req);
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await connectDB();
  const device = await Device.findOneAndUpdate(
    { tokenHash: hashToken(token) },
    { lastSeenAt: new Date() },
  );
  if (!device) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const settings = withDefaults(device.settings);
  const balances = await getBalances(5 * 60_000);

  const items = balances.flatMap((b) =>
    b.items.map((i) => ({
      p: b.provider,
      cur: i.currency,
      total: i.total,
      ok: b.available,
      stale: b.stale,
    })),
  );

  // 字段尽量少、尽量扁平，方便单片机用 ArduinoJson 解析
  return NextResponse.json({
    t: Math.floor(Date.now() / 1000),
    items: filterByCurrency(items, settings.currency),
    cfg: {
      v: device.settingsVersion ?? 1,
      refresh: settings.refreshSec,
      bright: settings.brightness,
      flip: settings.flip,
      cur: settings.currency,
    },
  });
}

// 币种筛选在服务端做好，设备只管按顺序显示
function filterByCurrency<T extends { cur: string; total: number }>(
  items: T[],
  currency: DeviceSettings['currency'],
): T[] {
  if (currency !== 'auto') return items.filter((i) => i.cur === currency);
  // auto：隐藏余额为 0 的币种；全部为 0 时保留，让屏幕能提示该充值了
  const nonZero = items.filter((i) => i.total !== 0);
  return nonZero.length > 0 ? nonZero : items;
}
