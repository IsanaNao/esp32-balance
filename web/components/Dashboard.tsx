'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Balance = {
  provider: string;
  name: string;
  available: boolean;
  items: { currency: string; total: number; granted: number; toppedUp: number }[];
  fetchedAt: string;
  stale: boolean;
  error?: string;
};

const SYMBOL: Record<string, string> = { CNY: '¥', USD: '$' };

export default function Dashboard() {
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/balance${refresh ? '?refresh=1' : ''}`).catch(() => null);
    setLoading(false);
    if (res?.status === 401) {
      location.href = '/login';
      return;
    }
    if (!res?.ok) {
      setError('加载失败，请稍后重试');
      return;
    }
    setBalances((await res.json()).balances);
  }, []);

  useEffect(() => {
    // 首次挂载时拉一次余额；setState 都发生在 await 之后，不会造成同步级联渲染
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">余额</h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
          >
            {loading ? '刷新中…' : '刷新'}
          </button>
          <Link href="/settings" className="rounded-lg border border-border px-3 py-1.5">
            设置
          </Link>
        </div>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {balances?.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted">
          还没有配置 API Key，去
          <Link href="/settings" className="text-accent underline">
            设置
          </Link>
          里添加
        </p>
      )}

      {balances?.map((b) => (
        <section key={b.provider} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{b.name}</h2>
            <span className={`text-xs ${b.available ? 'text-ok' : 'text-danger'}`}>
              {b.available ? '● 可用' : '● 余额不足'}
            </span>
          </div>

          {b.items.map((i) => (
            <div key={i.currency} className="mt-3">
              <p className="font-mono text-3xl font-semibold tabular-nums">
                {SYMBOL[i.currency] ?? ''}
                {i.total.toFixed(2)}
                <span className="ml-1 text-sm font-normal text-muted">{i.currency}</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                充值 {i.toppedUp.toFixed(2)} · 赠送 {i.granted.toFixed(2)}
              </p>
            </div>
          ))}

          <p className="mt-3 text-xs text-muted">
            {b.fetchedAt ? `更新于 ${new Date(b.fetchedAt).toLocaleString('zh-CN')}` : '尚未拉取'}
            {b.stale && <span className="ml-2 text-danger">（本次刷新失败：{b.error}）</span>}
          </p>
        </section>
      ))}
    </div>
  );
}
