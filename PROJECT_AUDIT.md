# 项目审计报告

> 最后更新：2026-10-22（Web 端 MVP 骨架）

## 技术栈
- **框架**: Next.js 16.1.6 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS v4
- **数据库**: MongoDB Atlas（`Cluster4Comments` 集群，独立的 `balance` 库）+ Mongoose 8
- **认证**: jose 6（JWT，HS256）
- **加密**: Node `crypto`（AES-256-GCM / SHA-256）
- **部署**: Vercel Hobby，子域名 `lab.taplis.me`（Cloudflare DNS only）
- **固件**: 待定

## 项目结构
```
.gitignore                  # 根目录统一忽略规则（web + firmware）
README.md                   # 入口说明
DEVELOPMENT_CHECKLIST.md    # 开发清单
PROJECT_AUDIT.md            # 本文件
firmware/
  └── README.md             # 设备接口约定（固件只需对接这一个接口）
web/
  ├── .env.example          # 环境变量模板
  ├── next.config.ts        # 安全响应头 + sw.js 禁缓存
  ├── app/
  │   ├── layout.tsx        # 根布局（noindex、viewport、注册 SW）
  │   ├── page.tsx          # 余额首页（服务端校验登录）
  │   ├── login/page.tsx    # 登录页
  │   ├── settings/page.tsx # 设置页（服务端校验登录）
  │   ├── manifest.ts       # PWA manifest
  │   ├── apple-icon.tsx    # iOS 主屏图标（代码生成占位）
  │   ├── icons/[size]/route.tsx   # PWA 图标 192 / 512（代码生成占位）
  │   └── api/
  │       ├── auth/login/route.ts       # 登录（POST；限流 + 常量时间比较）
  │       ├── auth/logout/route.ts      # 登出（POST）
  │       ├── balance/route.ts          # PWA 查询余额（GET；?refresh=1 强制刷新）
  │       ├── keys/[provider]/route.ts  # 服务商 Key（GET 状态 / PUT 保存 / DELETE）
  │       ├── devices/route.ts          # 设备列表（GET）/ 新建（POST，返回一次性 Token）
  │       ├── devices/[id]/route.ts     # 删除设备 = 吊销 Token（DELETE）
  │       └── device/balance/route.ts   # ESP32 专用（GET；Bearer 设备 Token）
  ├── components/
  │   ├── Dashboard.tsx              # 余额卡片
  │   ├── Settings.tsx               # Key 管理 + 设备管理
  │   └── ServiceWorkerRegister.tsx  # 仅生产环境注册 SW
  ├── lib/
  │   ├── auth.ts          # 会话签发 / 校验、requireSession、requirePageSession
  │   ├── crypto.ts        # Key 加解密、设备 Token 生成与哈希
  │   ├── db.ts            # Mongoose 连接缓存
  │   ├── providers.ts     # 服务商适配层（目前只有 DeepSeek）
  │   ├── balance.ts       # 余额聚合 + 缓存策略
  │   └── getClientIp.ts   # 取客户端 IP（限流用）
  ├── models/index.ts      # ProviderKey / Device / LoginAttempt
  └── public/
      ├── sw.js            # 最小 Service Worker
      └── offline.html     # 离线提示页
```

## 核心功能

### 1. 登录
- 两人共用 `APP_PASSWORD`，比较前先 SHA-256 成等长再 `timingSafeEqual`
- 同一 IP 失败 5 次锁 24 小时（`LoginAttempt` TTL 索引自动过期）
- 成功后签发 30 天 JWT，`HttpOnly` + `SameSite=Strict` + 生产环境 `Secure`
- 页面在服务端用 `requirePageSession()` 校验，接口用 `requireSession()` 校验

### 2. 服务商 Key 管理
- 保存前先用 Key 调一次余额接口，验证通过才入库
- 入库前 AES-256-GCM 加密，只额外保存末 4 位用于辨认
- 任何接口都不会把 Key 原文返回给前端

### 3. 余额查询与缓存
- Vercel Hobby 的 Cron 一天只能跑一次，所以**不做后台轮询**，按需拉取
- 缓存放在 `ProviderKey.cachedBalance`：PWA 默认 5 分钟、手动刷新 30 秒下限；设备 5 分钟
- 拉取失败时返回旧缓存并标记 `stale`，前端 / 设备可以提示

### 4. 设备
- 设备 Token：`dev_` + 24 字节随机数（base64url），只在创建时返回一次
- 数据库只存 SHA-256 哈希；删除设备即吊销
- 设备每次请求更新 `lastSeenAt`，在设置页显示「最后在线」

### 5. PWA
- `display: standalone`，支持 Android 安装和 iOS 添加到主屏幕
- Service Worker **只缓存离线页**，不缓存页面和接口：余额必须实时，避免显示过期数字
- 图标目前是代码生成的占位图

## API 接口

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/login` | 无（限流） | `{ password }` |
| POST | `/api/auth/logout` | 无 | 清除 Cookie |
| GET | `/api/balance` | 会话 | `?refresh=1` 强制刷新 |
| GET / PUT / DELETE | `/api/keys/[provider]` | 会话 | PUT `{ apiKey }` |
| GET / POST | `/api/devices` | 会话 | POST `{ name }` → `{ id, name, token }` |
| DELETE | `/api/devices/[id]` | 会话 | |
| GET | `/api/device/balance` | 设备 Token | 格式见 `firmware/README.md` |

## 数据模型（`balance` 库）

| 集合 | 字段 | 说明 |
|---|---|---|
| `providerkeys` | provider, key{iv,tag,data}, last4, cachedBalance, cachedAt | provider 唯一 |
| `devices` | name, tokenHash, lastSeenAt | tokenHash 唯一 |
| `loginattempts` | ip, createdAt | 24 小时 TTL |

> 注：Atlas 里手动建的 `devices` 集合会被 Mongoose 直接复用；其余集合首次写入时自动创建。

## 数据流
```
ESP32 ──Bearer dev_xxx──> /api/device/balance ─┐
                                               ├─> lib/balance.ts ──(缓存过期)──> api.deepseek.com/user/balance
PWA  ──Cookie──────────> /api/balance ─────────┘          │
                                                    Atlas balance 库
```

## 隐私与安全
- 仓库公开：所有密钥只在 Vercel 环境变量 / 本地 `.env.local`，`.gitignore` 排除 `.env*`、`*.bin`、`secrets.h`
- 数据库用户只有 `balance` 库的读写权限，碰不到博客的 `test` 库
- 全站 `noindex`；响应头 `X-Frame-Options: DENY`、`nosniff`、`Referrer-Policy: same-origin`
- `ENCRYPTION_KEY` 一旦设置不能更换（更换后已存的 Key 无法解密，需要重新填）

## 依赖包
- 核心：next 16.1.6、react 19.2.3、react-dom 19.2.3
- 数据库：mongoose 8
- 认证：jose 6
- 其他：server-only（防止服务端模块被打进前端）
- 开发：tailwindcss 4、typescript 5、eslint 9 + eslint-config-next

## 已知问题/待优化
- 设备接口没有单独限流：只有持有有效 Token 才会访问数据库之外的资源，且余额有 5 分钟缓存，暂时可接受
- 登录限流按 IP 计数，同一出口 IP 的两人会共享次数
- PWA 图标是占位图
- 固件、CI、网页烧录均未开始

## 开发规范
- 新增服务商：在 `lib/providers.ts` 加一个实现并注册，前端在 `Settings.tsx` 加一张 `ProviderKeyCard`，设备接口无需改动
- 设备接口字段只增不改，改了要同步更新 `firmware/README.md` 并通知硬件负责人
- 每次功能变更同步更新本文件和 `DEVELOPMENT_CHECKLIST.md`

## 部署与域名
- Vercel 项目 `esp32-balance`，Root Directory = `web`，推送 `main` 自动部署
- 域名 `lab.taplis.me` → Cloudflare CNAME（DNS only），证书由 Vercel 自动签发
- 固件计划放在同域名 `/firmware/` 下，不使用博客的 R2 图床
