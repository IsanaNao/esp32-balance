import 'server-only';
import mongoose, { Schema, Model, HydratedDocument } from 'mongoose';
import type { Encrypted } from '@/lib/crypto';

// 所有集合都在 balance 库里（由 MONGODB_URI 的路径决定）
// 类型用手写 interface，不用 InferSchemaType：后者在 mongoose 8 里会让 tsc 内存爆掉

// ---- 服务商 API Key（加密存储）+ 最近一次余额缓存 ----
export interface IProviderKey {
  provider: string; // 'deepseek'
  key: Encrypted;
  last4: string; // 只用于在界面上辨认是哪个 Key
  cachedBalance: unknown;
  cachedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export type ProviderKeyDocument = HydratedDocument<IProviderKey>;

const providerKeySchema = new Schema<IProviderKey>(
  {
    provider: { type: String, required: true, unique: true },
    key: {
      iv: { type: String, required: true },
      tag: { type: String, required: true },
      data: { type: String, required: true },
    },
    last4: { type: String, required: true },
    cachedBalance: { type: Schema.Types.Mixed, default: null },
    cachedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ---- 设备：只存 token 的哈希 ----
export interface IDevice {
  name: string;
  tokenHash: string;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    name: { type: String, required: true, maxlength: 40 },
    tokenHash: { type: String, required: true, unique: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ---- 登录失败记录：24 小时后自动过期 ----
interface ILoginAttempt {
  ip: string;
  createdAt: Date;
}

const loginAttemptSchema = new Schema<ILoginAttempt>({
  ip: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

// 开发热更新时模型会重复注册，先复用已有的
export const ProviderKey: Model<IProviderKey> =
  mongoose.models.ProviderKey ?? mongoose.model('ProviderKey', providerKeySchema);
export const Device: Model<IDevice> =
  mongoose.models.Device ?? mongoose.model('Device', deviceSchema);
export const LoginAttempt: Model<ILoginAttempt> =
  mongoose.models.LoginAttempt ?? mongoose.model('LoginAttempt', loginAttemptSchema);
