import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'crypto';
import { ConfigError } from './configError';

// 初版：两人共用一个密码（APP_PASSWORD），登录后签发 JWT 存在 HttpOnly Cookie
// 以后做用户池时，在 payload 里加上用户 id 即可，调用方不用改

const COOKIE_NAME = 'balance_session';
const SESSION_DAYS = 30;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ConfigError('没有读到环境变量 JWT_SECRET');
  if (secret.length < 32) {
    throw new ConfigError(`JWT_SECRET 只有 ${secret.length} 个字符，至少需要 32 个`);
  }
  return new TextEncoder().encode(secret);
}

// 先哈希成等长再比较，避免逐字符比较的计时差异
export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function createSession(): Promise<string> {
  return new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function hasSession(req: NextRequest): Promise<boolean> {
  return verifyToken(req.cookies.get(COOKIE_NAME)?.value);
}

/**
 * 页面（Server Component）里用：未登录就跳转到 /login
 */
export async function requirePageSession() {
  const store = await cookies();
  if (!(await verifyToken(store.get(COOKIE_NAME)?.value))) redirect('/login');
}

/**
 * 需要登录的接口在开头调用：未登录时返回 401 响应，已登录返回 null
 */
export async function requireSession(req: NextRequest): Promise<NextResponse | null> {
  if (await hasSession(req)) return null;
  return NextResponse.json({ error: '未登录' }, { status: 401 });
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}
