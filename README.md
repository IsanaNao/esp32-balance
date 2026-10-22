# esp32-balance

两人协作的 **AI API 余额显示器**：ESP32 硬件负责轮询并显示余额，手机 PWA 负责登录、管理 API Key / 设备、查看余额。后端跑在 [lab.taplis.me](https://lab.taplis.me)，数据落在 MongoDB Atlas 的 `balance` 库。

当前 Web 端 MVP 已就绪（共用密码登录、DeepSeek Key 加密存储、设备 Token、余额 5 分钟缓存、PWA）；固件与云端编译流水线待硬件侧推进。

## 架构

```
ESP32 ──(设备 Token)──> lab.taplis.me/api/device/balance ──> 各家 AI 余额接口
PWA   ──(登录)──────> lab.taplis.me/api/...  （管理 Key、设备、查看余额）
                              │
                        Atlas balance 库
```

- **设备侧**：只认一个接口 `GET /api/device/balance`（`Authorization: Bearer dev_…`），字段尽量扁平，方便单片机解析。约定见 [`firmware/README.md`](./firmware/README.md)。
- **PWA 侧**：共用密码登录（JWT Cookie），在设置页保存各家 API Key、增删设备；首页拉余额。
- **服务端**：Key 用 AES-256-GCM 加密入库；设备只存 Token 哈希；余额按需拉取并缓存约 5 分钟，设备轮询建议 ≥ 5 分钟。

目前已接服务商：DeepSeek。后续可按 `web/lib/providers.ts` 的适配层继续加。

## 仓库结构

```
esp32-balance/
├── firmware/              ← ESP32 固件（PlatformIO，框架/硬件待定）
├── web/                   ← PWA + API（Next.js，部署到 lab.taplis.me）
└── .github/workflows/     ← 云端编译固件（待实现）
```

| 目录 | 职责 |
|------|------|
| `web/` | Next.js App Router：登录、Key/设备管理、余额 API、设备专用接口、PWA |
| `firmware/` | ESP32 工程；目前只有接口约定文档，工程初始化由硬件负责人完成 |
| `.github/workflows/` | 推送后编译固件、打 Release；再经 Vercel 放到站点上供网页烧录 / OTA（计划中） |

更多实现细节与开发进度见：

- [`DEVELOPMENT_CHECKLIST.md`](./DEVELOPMENT_CHECKLIST.md) — 分阶段清单
- [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md) — Web 端现状审计

## 本地运行 web

```bash
cd web
npm install
cp .env.example .env.local   # 填写 MONGODB_URI / APP_PASSWORD / JWT_SECRET / ENCRYPTION_KEY
npm run dev
```

打开 <http://localhost:3000>，用 `APP_PASSWORD` 登录。

环境变量说明见 `web/.env.example`。`ENCRYPTION_KEY` 一旦线上用过不要再改，否则已存 Key 无法解密。

## 部署

推送到 `main` 后由 Vercel 自动部署。项目需配置：

1. **Root Directory** = `web`
2. 环境变量与 `.env.example` 一致（4 个）

域名：`lab.taplis.me`（Cloudflare CNAME → Vercel）。

## 协作约定

- 不要提交任何 `.env*`、WiFi 密码、API Key、设备 Token（仓库公开，已开 GitHub Push Protection 兜底）
- 改动走 PR，由仓库所有者合并
- 前端 / API 改 `web/`；固件改 `firmware/`，并遵守设备接口约定，避免擅自改响应字段
