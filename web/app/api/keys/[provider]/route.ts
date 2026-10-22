import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { providers, ProviderError } from '@/lib/providers';
import connectDB from '@/lib/db';
import { ProviderKey } from '@/models';

type Ctx = { params: Promise<{ provider: string }> };

// 查看是否已配置：永远不返回 Key 本身，只返回末 4 位
export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { provider } = await params;
  await connectDB();
  const doc = await ProviderKey.findOne({ provider });
  return NextResponse.json({
    configured: !!doc,
    last4: doc?.last4 ?? null,
    updatedAt: doc?.updatedAt ?? null,
  });
}

// 保存 Key：先用它查一次余额，能查到才保存
export async function PUT(req: NextRequest, { params }: Ctx) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { provider } = await params;
  const impl = providers[provider];
  if (!impl) return NextResponse.json({ error: '不支持的服务商' }, { status: 404 });

  const { apiKey } = await req.json().catch(() => ({}));
  if (typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    return NextResponse.json({ error: '请填写 API Key' }, { status: 400 });
  }
  const key = apiKey.trim();

  let balance;
  try {
    balance = await impl.fetchBalance(key);
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 502;
    const message = error instanceof Error ? error.message : '验证失败';
    return NextResponse.json({ error: message }, { status });
  }

  try {
    await connectDB();
    await ProviderKey.findOneAndUpdate(
      { provider },
      { key: encrypt(key), last4: key.slice(-4), cachedBalance: balance, cachedAt: new Date() },
      { upsert: true },
    );
  } catch (error) {
    // 最常见的原因是 ENCRYPTION_KEY 格式不对，具体信息只写进 Vercel 日志
    console.error('[PUT /api/keys]', error);
    return NextResponse.json(
      { error: '保存失败：服务器配置有误，请检查 ENCRYPTION_KEY 是否为 32 字节的 base64' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, last4: key.slice(-4) });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { provider } = await params;
  await connectDB();
  await ProviderKey.deleteOne({ provider });
  return NextResponse.json({ ok: true });
}
