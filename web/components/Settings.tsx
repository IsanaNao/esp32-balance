'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type KeyStatus = { configured: boolean; last4: string | null; updatedAt: string | null };
type Device = { id: string; name: string; createdAt: string; lastSeenAt: string | null };

const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent';
const button = 'rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50';

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  }).catch(() => null);
  if (res?.status === 401) location.href = '/login';
  const data = await res?.json().catch(() => null);
  return { ok: !!res?.ok, data };
}

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
      <input
        type="password"
        autoComplete="off"
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

function DevicesCard() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<{ name: string; token: string } | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { ok, data } = await api('/api/devices');
    if (ok) setDevices(data.devices);
    else setMessage('设备列表加载失败，请稍后重试');
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function create() {
    setMessage('');
    const { ok, data } = await api('/api/devices', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!ok) {
      setMessage(data?.error ?? '创建失败');
      return;
    }
    setNewToken({ name: data.name, token: data.token });
    setName('');
    load();
  }

  async function remove(d: Device) {
    if (!confirm(`删除「${d.name}」后，这台设备将无法再获取余额。确定？`)) return;
    await api(`/api/devices/${d.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">设备</h2>

      {newToken && (
        <div className="rounded-lg border border-accent p-3 text-sm">
          <p className="mb-2">
            「{newToken.name}」的设备 Token，<strong>只显示这一次</strong>，请在设备配网时填入：
          </p>
          <code className="block break-all rounded bg-background p-2 font-mono text-xs">
            {newToken.token}
          </code>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(newToken.token)}
              className={button}
            >
              复制
            </button>
            <button onClick={() => setNewToken(null)} className={button}>
              我已保存
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-border">
        {devices?.length === 0 && <li className="py-2 text-sm text-muted">还没有设备</li>}
        {devices?.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2">
            <div>
              <p>{d.name}</p>
              <p className="text-xs text-muted">
                {d.lastSeenAt
                  ? `最后在线 ${new Date(d.lastSeenAt).toLocaleString('zh-CN')}`
                  : '从未连接'}
              </p>
            </div>
            <button onClick={() => remove(d)} className={`${button} text-danger`}>
              删除
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          placeholder="设备名称，比如 书桌"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
        <button onClick={create} disabled={!name.trim()} className={`${button} shrink-0`}>
          添加
        </button>
      </div>
      {message && <p className="text-sm text-danger">{message}</p>}
    </section>
  );
}
