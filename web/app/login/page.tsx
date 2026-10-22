'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setLoading(false);

    if (res?.ok) {
      router.replace('/');
      router.refresh();
    } else {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? '网络错误，请稍后重试');
    }
  }

  return (
    <form onSubmit={submit} className="mt-24 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">AI 余额显示器</h1>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="访问密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2.5 outline-none focus:border-accent"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        disabled={loading || !password}
        className="rounded-lg bg-foreground py-2.5 font-medium text-background disabled:opacity-50"
      >
        {loading ? '登录中…' : '登录'}
      </button>
    </form>
  );
}
