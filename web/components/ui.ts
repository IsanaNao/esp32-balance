// 设置页各卡片共用的样式和请求封装

export const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent';
export const button = 'rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50';

// 未登录自动跳转登录页；返回 { ok, data }，网络错误时 data 为 null
export async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  }).catch(() => null);
  if (res?.status === 401) location.href = '/login';
  const data = await res?.json().catch(() => null);
  return { ok: !!res?.ok, data };
}
