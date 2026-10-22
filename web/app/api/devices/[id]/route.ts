import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { requireSession } from '@/lib/auth';
import connectDB from '@/lib/db';
import { Device } from '@/models';

// 删除设备 = 吊销它的 token
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(req);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: '设备不存在' }, { status: 404 });

  await connectDB();
  await Device.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
