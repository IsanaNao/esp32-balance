'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, button, input } from './ui';

type DeviceSettings = {
  refreshSec: number;
  brightness: number;
  flip: boolean;
  currency: 'auto' | 'CNY' | 'USD';
};
type Device = {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  settings: DeviceSettings;
};

const REFRESH_OPTIONS = [
  { value: 300, label: '5 分钟' },
  { value: 600, label: '10 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
];
const CURRENCY_OPTIONS = [
  { value: 'auto', label: '自动（隐藏余额为 0 的币种）' },
  { value: 'CNY', label: '只显示人民币' },
  { value: 'USD', label: '只显示美元' },
];

export default function DevicesCard() {
  const [devices, setDevices] = useState<Device[] | null>(null);
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

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">设备</h2>

      <ul className="flex flex-col divide-y divide-border">
        {devices?.length === 0 && <li className="py-2 text-sm text-muted">还没有设备</li>}
        {devices?.map((d) => (
          <DeviceRow key={d.id} device={d} onChanged={load} />
        ))}
      </ul>
      {message && <p className="text-sm text-danger">{message}</p>}

      <PairForm onPaired={load} />
      <ManualTokenForm onCreated={load} />
    </section>
  );
}

// ---- 用设备屏幕上的 6 位配对码添加设备（正常流程）----
function PairForm({ onPaired }: { onPaired: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage('');
    const { ok, data } = await api('/api/devices/claim', {
      method: 'POST',
      body: JSON.stringify({ code, name }),
    });
    setBusy(false);
    if (!ok) {
      setMessage(data?.error ?? '配对失败');
      return;
    }
    setCode('');
    setName('');
    setMessage('已配对，设备几秒内会自动连上，屏幕切换到余额后刷新本页即可看到');
    // 设备要等下一次轮询才会真正创建，稍等再刷新列表
    setTimeout(onPaired, 8000);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">配对新设备</p>
      <p className="text-xs text-muted">设备连上 WiFi 后屏幕会显示 6 位配对码，10 分钟内有效</p>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="6 位配对码"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className={`${input} font-mono tracking-widest`}
      />
      <input
        placeholder="设备名称，比如 书桌"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={input}
      />
      <button
        onClick={submit}
        disabled={busy || code.length !== 6 || !name.trim()}
        className={`${button} self-start`}
      >
        {busy ? '配对中…' : '配对'}
      </button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}

// ---- 已配对的设备：显示状态，展开后可改设置 ----
function DeviceRow({ device, onChanged }: { device: Device; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(device.name);
  const [settings, setSettings] = useState(device.settings);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage('');
    const { ok, data } = await api(`/api/devices/${device.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, settings }),
    });
    setBusy(false);
    setMessage(ok ? '已保存，设备下次刷新时生效' : (data?.error ?? '保存失败'));
    if (ok) onChanged();
  }

  async function remove() {
    if (!confirm(`删除「${device.name}」后，这台设备将无法再获取余额，需要重新配对。确定？`)) return;
    await api(`/api/devices/${device.id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate">{device.name}</p>
          <p className="text-xs text-muted">
            {device.lastSeenAt
              ? `最后在线 ${new Date(device.lastSeenAt).toLocaleString('zh-CN')}`
              : '从未连接'}
          </p>
        </div>
        <button onClick={() => setOpen(!open)} className={`${button} shrink-0`}>
          {open ? '收起' : '设置'}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-muted">名称</span>
            <input
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">刷新间隔</span>
            <select
              value={settings.refreshSec}
              onChange={(e) => setSettings({ ...settings, refreshSec: Number(e.target.value) })}
              className={input}
            >
              {REFRESH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">显示币种</span>
            <select
              value={settings.currency}
              onChange={(e) =>
                setSettings({ ...settings, currency: e.target.value as DeviceSettings['currency'] })
              }
              className={input}
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">屏幕亮度 {Math.round((settings.brightness / 255) * 100)}%</span>
            <input
              type="range"
              min={0}
              max={255}
              value={settings.brightness}
              onChange={(e) => setSettings({ ...settings, brightness: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.flip}
              onChange={(e) => setSettings({ ...settings, flip: e.target.checked })}
            />
            <span>屏幕旋转 180°</span>
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !name.trim()} className={button}>
              {busy ? '保存中…' : '保存'}
            </button>
            <button onClick={remove} className={`${button} text-danger`}>
              删除设备
            </button>
          </div>
          {message && <p className="text-muted">{message}</p>}
        </div>
      )}
    </li>
  );
}

// ---- 手动生成 token（调试用：固件开发阶段直接写进 secrets.h）----
function ManualTokenForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<{ name: string; token: string } | null>(null);
  const [message, setMessage] = useState('');

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
    onCreated();
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted">手动生成设备 Token（固件调试用）</summary>
      <div className="mt-2 flex flex-col gap-2">
        {newToken && (
          <div className="rounded-lg border border-accent p-3">
            <p className="mb-2">
              「{newToken.name}」的设备 Token，<strong>只显示这一次</strong>：
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
        <div className="flex gap-2">
          <input
            placeholder="设备名称"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
          <button onClick={create} disabled={!name.trim()} className={`${button} shrink-0`}>
            生成
          </button>
        </div>
        {message && <p className="text-danger">{message}</p>}
      </div>
    </details>
  );
}
