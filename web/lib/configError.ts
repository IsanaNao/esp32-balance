// 环境变量缺失 / 格式不对时抛这个错误
// message 只包含变量名和要求（不含变量值），可以安全地显示在页面上，方便排查
export class ConfigError extends Error {}

export function configErrorMessage(error: unknown): string | null {
  return error instanceof ConfigError ? `服务器配置有误：${error.message}` : null;
}
