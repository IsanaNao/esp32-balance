// 每台设备的显示设置：在 PWA 里改，存在服务器，设备下次请求余额时随 cfg 字段取回
// 新增设置项时：这里加默认值和校验 → Settings.tsx 加控件 → firmware/README.md 加字段说明

export const CURRENCIES = ['auto', 'CNY', 'USD'] as const;
export type CurrencySetting = (typeof CURRENCIES)[number];

export type DeviceSettings = {
  refreshSec: number; // 设备轮询间隔，服务端缓存 5 分钟，所以下限 300
  brightness: number; // 屏幕亮度 0-255（OLED 对应 contrast）
  flip: boolean; // 屏幕旋转 180°
  currency: CurrencySetting; // auto = 隐藏余额为 0 的币种
};

export const DEFAULT_SETTINGS: DeviceSettings = {
  refreshSec: 300,
  brightness: 255,
  flip: false,
  currency: 'auto',
};

export const REFRESH_MIN = 300;
export const REFRESH_MAX = 86400;

/**
 * 校验 PWA 提交的部分设置：返回合法的字段，或第一条错误信息
 */
export function parseSettingsPatch(
  input: unknown,
): { ok: true; value: Partial<DeviceSettings> } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) return { ok: false, error: '设置格式不对' };
  const src = input as Record<string, unknown>;
  const out: Partial<DeviceSettings> = {};

  if ('refreshSec' in src) {
    const v = src.refreshSec;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < REFRESH_MIN || v > REFRESH_MAX) {
      return { ok: false, error: `刷新间隔需为 ${REFRESH_MIN}-${REFRESH_MAX} 秒的整数` };
    }
    out.refreshSec = v;
  }
  if ('brightness' in src) {
    const v = src.brightness;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 255) {
      return { ok: false, error: '亮度需为 0-255 的整数' };
    }
    out.brightness = v;
  }
  if ('flip' in src) {
    if (typeof src.flip !== 'boolean') return { ok: false, error: '旋转设置格式不对' };
    out.flip = src.flip;
  }
  if ('currency' in src) {
    if (!CURRENCIES.includes(src.currency as CurrencySetting)) {
      return { ok: false, error: '币种只能是 auto / CNY / USD' };
    }
    out.currency = src.currency as CurrencySetting;
  }
  return { ok: true, value: out };
}

/**
 * 旧设备文档可能没有 settings 字段，统一补默认值
 */
export function withDefaults(settings: Partial<DeviceSettings> | null | undefined): DeviceSettings {
  return { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
}
