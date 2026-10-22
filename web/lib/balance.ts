import 'server-only';
import connectDB from './db';
import { decrypt } from './crypto';
import { ProviderKey, type ProviderKeyDocument } from '@/models';
import { providers, type Balance } from './providers';

export type BalanceResult = Balance & {
  name: string;
  fetchedAt: string;
  stale: boolean; // 本次拉取失败，返回的是旧缓存
  error?: string;
};

// Vercel Hobby 的定时任务一天只能跑一次，所以不做后台轮询：
// 有人来查时，缓存超过 maxAgeMs 才去服务商那边重新拉
export async function getBalances(maxAgeMs: number): Promise<BalanceResult[]> {
  await connectDB();
  const keys = await ProviderKey.find();

  return Promise.all(
    keys.map(async (doc) => {
      const provider = providers[doc.provider];
      const fresh = doc.cachedAt && Date.now() - doc.cachedAt.getTime() < maxAgeMs;

      if (!fresh && provider) {
        try {
          const balance = await provider.fetchBalance(decrypt(doc.key));
          doc.cachedBalance = balance;
          doc.cachedAt = new Date();
          await doc.save();
        } catch (error) {
          const message = error instanceof Error ? error.message : '拉取失败';
          return toResult(doc, true, message);
        }
      }
      return toResult(doc, false);
    }),
  );
}

function toResult(
  doc: ProviderKeyDocument,
  stale: boolean,
  error?: string,
): BalanceResult {
  const cached = doc.cachedBalance as Balance | null;
  return {
    provider: doc.provider,
    name: providers[doc.provider]?.name ?? doc.provider,
    available: cached?.available ?? false,
    items: cached?.items ?? [],
    fetchedAt: doc.cachedAt?.toISOString() ?? '',
    stale,
    ...(error ? { error } : {}),
  };
}
