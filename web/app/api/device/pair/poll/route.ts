import { NextRequest, NextResponse } from 'next/server';
import { generateDeviceToken, hashToken } from '@/lib/crypto';
import { getBearer } from '@/lib/bearer';
import connectDB from '@/lib/db';
import { Device, PairingRequest, PAIRING_TTL_SEC } from '@/models';

// 设备拿着 /pair/start 返回的 secret 轮询，直到 PWA 输入了配对码
// 请求头：Authorization: Bearer pair_xxx
export async function POST(req: NextRequest) {
  const secret = getBearer(req);
  if (!secret) return NextResponse.json({ status: 'expired' }, { status: 404 });

  await connectDB();
  const secretHash = hashToken(secret);
  // TTL 索引每分钟才清理一次，这里自己再判断一次过期
  const notExpired = { createdAt: { $gt: new Date(Date.now() - PAIRING_TTL_SEC * 1000) } };

  // 原子地取出并删除「已认领」的请求：设备重复轮询也只会拿到一次 token
  const claimed = await PairingRequest.findOneAndDelete({ secretHash, claimed: true, ...notExpired });
  if (claimed) {
    const token = generateDeviceToken();
    const device = await Device.create({
      name: claimed.name ?? '新设备',
      tokenHash: hashToken(token),
    });
    return NextResponse.json({ status: 'paired', token, name: device.name });
  }

  const pending = await PairingRequest.exists({ secretHash, ...notExpired });
  if (pending) return NextResponse.json({ status: 'pending' });

  return NextResponse.json({ status: 'expired' }, { status: 404 });
}
