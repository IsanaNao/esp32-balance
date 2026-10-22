import { NextRequest, NextResponse } from 'next/server';
import { generatePairCode, generatePairSecret, hashToken } from '@/lib/crypto';
import { getClientIp } from '@/lib/getClientIp';
import connectDB from '@/lib/db';
import { PairingRequest, PAIRING_TTL_SEC } from '@/models';

// 同一 IP 同时最多挂着几个未完成的配对请求（防止被刷数据库）
const MAX_PENDING_PER_IP = 5;
// 建议设备轮询 /pair/poll 的间隔
const POLL_SEC = 5;

// 设备开机发现自己没有 token 时调用：拿到配对码显示在屏幕上，拿到 secret 留着轮询
// 不需要鉴权：配对码只有在已登录的 PWA 里输入后才会生效
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  await connectDB();

  if ((await PairingRequest.countDocuments({ ip })) >= MAX_PENDING_PER_IP) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  const secret = generatePairSecret();
  // 配对码有唯一索引，极小概率撞码时重试
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePairCode();
    try {
      await PairingRequest.create({ code, secretHash: hashToken(secret), ip });
      return NextResponse.json({ code, secret, expiresIn: PAIRING_TTL_SEC, poll: POLL_SEC });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
  return NextResponse.json({ error: 'busy' }, { status: 503 });
}
