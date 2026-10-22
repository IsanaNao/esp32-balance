import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { requireSession } from '@/lib/auth';
import { parseSettingsPatch, withDefaults } from '@/lib/deviceSettings';
import connectDB from '@/lib/db';
import { Device } from '@/models';

type Ctx = { params: Promise<{ id: string }> };

// 改设备名 / 显示设置：{ name?, settings?: { refreshSec?, brightness?, flip?, currency? } }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: '设备不存在' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 40) {
      return NextResponse.json({ error: '设备名称为 1-40 个字符' }, { status: 400 });
    }
    update.name = name;
  }

  let settingsChanged = false;
  if ('settings' in body) {
    const parsed = parseSettingsPatch(body.settings);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    for (const [key, value] of Object.entries(parsed.value)) {
      update[`settings.${key}`] = value;
      settingsChanged = true;
    }
  }

  await connectDB();
  const device = await Device.findByIdAndUpdate(
    id,
    { $set: update, ...(settingsChanged ? { $inc: { settingsVersion: 1 } } : {}) },
    { new: true },
  );
  if (!device) return NextResponse.json({ error: '设备不存在' }, { status: 404 });

  return NextResponse.json({
    id: device.id,
    name: device.name,
    settings: withDefaults(device.settings),
    settingsVersion: device.settingsVersion ?? 1,
  });
}

// 删除设备 = 吊销它的 token
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: '设备不存在' }, { status: 404 });

  await connectDB();
  await Device.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
