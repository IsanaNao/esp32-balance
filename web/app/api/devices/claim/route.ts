import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import connectDB from '@/lib/db';
import { PairingRequest, PAIRING_TTL_SEC } from '@/models';

// PWA 输入设备屏幕上的 6 位配对码，认领这台设备
// 真正的设备 token 在设备下一次轮询 /api/device/pair/poll 时生成并交给设备
export async function POST(req: NextRequest) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { code, name } = await req.json().catch(() => ({}));
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: '配对码是 6 位数字' }, { status: 400 });
  }
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 40) {
    return NextResponse.json({ error: '设备名称为 1-40 个字符' }, { status: 400 });
  }

  await connectDB();
  const updated = await PairingRequest.findOneAndUpdate(
    {
      code: code.trim(),
      claimed: false,
      createdAt: { $gt: new Date(Date.now() - PAIRING_TTL_SEC * 1000) },
    },
    { claimed: true, name: name.trim() },
  );
  if (!updated) {
    return NextResponse.json({ error: '配对码无效或已过期，请让设备重新生成' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
