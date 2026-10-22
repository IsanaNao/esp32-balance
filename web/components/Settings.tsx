'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DevicesCard from './DevicesCard';
import { api, button, input } from './ui';

type KeyStatus = { configured: boolean; last4: string | null; updatedAt: string | null };

export default function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">设置</h1>
        <Link href="/" className="rounded-lg border border-border px-3 py-1.5 text-sm">
          返回
        </Link>
      </header>
      <ProviderKeyCard provider="deepseek" name="DeepSeek" />
      <DevicesCard />
      <button
        onClick={async () => {
          await api('/api/auth/logout', { method: 'POST' });
          location.href = '/login';
        }}
        className={`${button} self-start text-danger`}
      >
        退出登录
      </button>
    </div>
  );
}

function ProviderKeyCard({ provider, name }: { provider: string; name: string }) {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { ok, data } = await api(`/api/keys/${provider}`);
    if (ok) setStatus(data);
    else setMessage('加载失败，请稍后重试');
  }, [provider]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save() {
    setBusy(true);
    setMessage('');
    const { ok, data } = await api(`/api/keys/${provider}`, {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    });
    setBusy(false);
    setMessage(ok ? '已保存并验证通过' : (data?.error ?? '保存失败'));
    if (ok) {
      setApiKey('');
      load();
    }
  }

  async function remove() {
    if (!confirm(`确定删除 ${name} 的 API Key？`)) return;
    await api(`/api/keys/${provider}`, { method: 'DELETE' });
    setMessage('已删除');
    load();
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">{name} API Key</h2>
      <p className="text-sm text-muted">
        {status === null
          ? message || '加载中…'
          : status.configured
            ? `已配置（末 4 位 ${status.last4}）`
            : '未配置'}
      </p>
      {/* 故意不用 type="password"：否则浏览器会把 API Key 当成登录密码提示保存并同步到云端 */}
      <input
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        placeholder={status?.configured ? '填写新 Key 以替换' : 'sk-...'}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className={input}
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !apiKey} className={button}>
          {busy ? '验证中…' : '保存'}
        </button>
        {status?.configured && (
          <button onClick={remove} className={`${button} text-danger`}>
            删除
          </button>
        )}
      </div>
      {message && status !== null && <p className="text-sm text-muted">{message}</p>}
    </section>
  );
}

