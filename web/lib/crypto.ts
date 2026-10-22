import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { ConfigError } from './configError';

// AI 服务商的 API Key 用 AES-256-GCM 加密后才写进数据库
// ENCRYPTION_KEY 是 32 字节随机数的 base64，生成方法见 README

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new ConfigError('没有读到环境变量 ENCRYPTION_KEY');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new ConfigError(
      `ENCRYPTION_KEY 解码后是 ${key.length} 字节，需要正好 32 字节，请用 README 里的命令重新生成`,
    );
  }
  return key;
}

export type Encrypted = { iv: string; tag: string; data: string };

export function encrypt(plain: string): Encrypted {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

export function decrypt(enc: Encrypted): string {
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(enc.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(enc.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(enc.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

// 设备 token 只存哈希：数据库泄露也拿不到可用的 token
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateDeviceToken(): string {
  return `dev_${randomBytes(24).toString('base64url')}`;
}
