# 项目开发清单

> 勾选规则：做完并在线上验证过再打勾。新增事项按阶段追加。

## 阶段 0：基础设施

- [x] GitHub 仓库 `IsanaNao/esp32-balance`（公开，个人账号）
- [ ] 仓库开启 Secret scanning + Push protection
- [ ] 把合作者加为 Collaborator
- [x] Vercel 项目 `esp32-balance`
- [x] 子域名 `lab.taplis.me`（Cloudflare CNAME，DNS only / 灰色云朵）
- [x] Atlas：在 `Cluster4Comments` 新建 `balance` 库 + `devices` 集合
- [x] Atlas：专用用户 `esp32-balance`，只有 `readWrite@balance`
- [x] Vercel → Root Directory 改为 `web`（Framework Preset = Next.js）
- [x] Vercel → 填写环境变量：`MONGODB_URI` / `APP_PASSWORD` / `JWT_SECRET` / `ENCRYPTION_KEY`

## 阶段 1：Web 端 MVP（DeepSeek）

- [x] Next.js 16 骨架（App Router + Tailwind v4）
- [x] 共用密码登录（JWT Cookie，失败 5 次锁 24 小时）
- [x] DeepSeek API Key：AES-256-GCM 加密存储，保存前先验证
- [x] 余额查询 + 5 分钟缓存（`/api/balance`）
- [x] 设备管理：生成 / 吊销设备 Token（只存哈希）
- [x] 设备接口 `/api/device/balance`
- [x] PWA：manifest、图标、Service Worker、离线页
- [ ] 线上部署后：登录 → 填 Key → 看到余额（端到端验证）
- [ ] 手机安装测试：Android Chrome、iOS Safari「添加到主屏幕」
- [ ] 用 curl 模拟设备请求，确认格式和 401 行为

## 阶段 2：固件（等硬件负责人定框架和硬件）

- [ ] 确定芯片 / 屏幕 / 框架，在 `firmware/` 初始化工程
- [ ] 配网：设备开热点（captive portal）填写 WiFi + 设备 Token，存 NVS
- [ ] 轮询 `/api/device/balance`（≥ 5 分钟），401 / 超时处理按 `firmware/README.md`
- [ ] HTTPS 根证书校验（替换开发期的 `setInsecure()`）
- [ ] 屏幕显示：余额、币种、更新时间、离线 / 旧数据标记

## 阶段 3：固件分发（免本地编译环境）

- [ ] GitHub Actions：推送后自动编译固件
- [ ] 打 tag 时发布 GitHub Release（`.bin` + `manifest.json`）
- [ ] Release 后触发 Vercel Deploy Hook，构建时把固件下载到 `web/public/firmware/`
- [ ] 网页烧录页（ESP Web Tools，需桌面版 Chrome / Edge）
- [ ] OTA：设备检查 `manifest.json` 版本号后自动升级

## 待定 / 以后

- [ ] 更多服务商：OpenRouter、Moonshot（有余额接口）；OpenAI / Anthropic（只有用量，需手动填充值额）
- [ ] 余额历史曲线（新建时间序列集合 `balance_snapshots`）
- [ ] 低余额提醒
- [ ] 用户池（替换共用密码）
