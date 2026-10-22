# esp32-balance

ESP32 硬件 + 手机 PWA 控制端的 AI API 余额显示器。

- 线上地址：<https://lab.taplis.me>
- 开发清单：[`DEVELOPMENT_CHECKLIST.md`](./DEVELOPMENT_CHECKLIST.md)
- 项目审计：[`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md)
- 设备接口约定：[`firmware/README.md`](./firmware/README.md)

## 目录

```
web/        PWA + API（Next.js，部署在 Vercel，Root Directory = web）
firmware/   ESP32 固件（框架待定）
```

## 本地运行 web

```bash
cd web
npm install
cp .env.example .env.local   # 然后填写里面的变量
npm run dev
```

打开 <http://localhost:3000>，用 `APP_PASSWORD` 登录。

## 部署

推送到 `main` 后 Vercel 自动部署。Vercel 项目需要：

1. Settings → Build and Deployment → **Root Directory** 设为 `web`
2. Settings → Environment Variables 填好 `.env.example` 里的 4 个变量

## 协作约定

- 不要提交任何 `.env*`、WiFi 密码、API Key、设备 Token（仓库是公开的，已开启 GitHub Push Protection 兜底）
- 合作者的改动走 PR，由仓库所有者合并（Vercel Hobby 对私有仓库协作者有限制，公开仓库目前不受影响，但保持这个习惯方便以后转私有）
