import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { generateDeviceToken, hashToken } from '@/lib/crypto';
import connectDB from '@/lib/db';
import { Device } from '@/models';

export async function GET(req: NextRequest) {
  const denied = await requireSession(req);
  if (denied) return denied;

  await connectDB();
  const devices = await Device.find().sort({ createdAt: -1 });
  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      lastSeenAt: d.lastSeenAt,
    })),
  });
}

// 新建设备：token 只在这次响应里出现一次，数据库里只存哈希
export async function POST(req: NextRequest) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 40) {
    return NextResponse.json({ error: '设备名称为 1-40 个字符' }, { status: 400 });
  }

  const token = generateDeviceToken();
  await connectDB();
  const device = await Device.create({ name: name.trim(), tokenHash: hashToken(token) });
  return NextResponse.json({ id: device.id, name: device.name, token });
}
