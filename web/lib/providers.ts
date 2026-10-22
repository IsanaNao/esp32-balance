import 'server-only';

// 各家服务商的余额接口统一转换成这个格式，PWA 和设备只认这个
export type Balance = {
  provider: string;
  available: boolean; // 余额是否足够继续调用
  items: { currency: string; total: number; granted: number; toppedUp: number }[];
};

type Provider = {
  id: string;
  name: string;
  fetchBalance: (apiKey: string) => Promise<Balance>;
};

// 文档：https://api-docs.deepseek.com/api/get-user-balance
const deepseek: Provider = {
  id: 'deepseek',
  name: 'DeepSeek',
  async fetchBalance(apiKey) {
    const res = await fetch('https://api.deepseek.com/user/balance', {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) throw new ProviderError('API Key 无效或已被删除', 400);
    if (!res.ok) throw new ProviderError(`DeepSeek 返回 ${res.status}`, 502);

    const json = (await res.json()) as {
      is_available: boolean;
      balance_infos: {
        currency: string;
        total_balance: string;
        granted_balance: string;
        topped_up_balance: string;
      }[];
    };
    return {
      provider: 'deepseek',
      available: json.is_available,
      items: json.balance_infos.map((b) => ({
        currency: b.currency,
        total: Number(b.total_balance),
        granted: Number(b.granted_balance),
        toppedUp: Number(b.topped_up_balance),
      })),
    };
  },
};

export const providers: Record<string, Provider> = { deepseek };

export class ProviderError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
