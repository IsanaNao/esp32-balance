import { NextRequest, NextResponse } from 'next/server';
import { createSession, passwordMatches, setSessionCookie } from '@/lib/auth';
import { getClientIp } from '@/lib/getClientIp';
import connectDB from '@/lib/db';
import { LoginAttempt } from '@/models';

// 同一 IP 每 24 小时最多允许失败的次数
const MAX_FAILED_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json().catch(() => ({}));
    const ip = getClientIp(req);

    await connectDB();
    const failed = await LoginAttempt.countDocuments({ ip });
    if (failed >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json({ error: '尝试次数过多，请 24 小时后再试' }, { status: 429 });
    }

    if (typeof password !== 'string' || !passwordMatches(password)) {
      await LoginAttempt.create({ ip });
      const remaining = MAX_FAILED_ATTEMPTS - failed - 1;
      return NextResponse.json(
        { error: remaining > 0 ? `密码错误，还剩 ${remaining} 次机会` : '密码错误，请 24 小时后再试' },
        { status: 401 },
      );
    }

    await LoginAttempt.deleteMany({ ip });
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, await createSession());
    return res;
  } catch (error) {
    // 具体原因（比如环境变量缺失）只写进 Vercel 日志，不返回给前端
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json(
      { error: '服务器出错，请查看 Vercel 日志（多半是环境变量没配好）' },
      { status: 500 },
    );
  }
}
