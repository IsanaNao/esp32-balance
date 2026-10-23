# 项目开发清单

> 勾选规则：做完并在线上验证过再打勾。新增事项按阶段追加。

## 阶段 0：基础设施

- [x] GitHub 仓库 `IsanaNao/esp32-balance`（公开，个人账号）
- [ ] 仓库开启 Secret scanning + Push protection
- [ ] 把合作者加为 Collaborator
- [x] Vercel 项目 `esp32-balance`
- [x] 子域名（Cloudflare CNAME，DNS only / 灰色云朵）
- [x] Atlas：在现有集群（与博客共用）新建 `balance` 库 + `devices` 集合
- [x] Atlas：项目专用数据库用户，只有 `readWrite@balance`
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
- [x] 线上部署后：登录 → 填 Key → 看到余额（端到端验证，2026-10-22）
- [ ] 手机安装测试：Android Chrome、iOS Safari「添加到主屏幕」（手机浏览器显示已验证，安装待测）
- [x] 用脚本模拟设备请求，确认格式和 401 行为（配对 + 设置下发 15 项本地端到端测试，2026-10-22）

## 阶段 1.5：配对 + 设置下发（服务端）

- [x] 配对码流程：`/api/device/pair/start` → PWA 输入 6 位码（`/api/devices/claim`）→ `/api/device/pair/poll` 拿 Token
- [x] 设备设置：刷新间隔、亮度、旋转、币种筛选，PWA 编辑（`PATCH /api/devices/[id]`）
- [x] `/api/device/balance` 增加 `cfg` 字段，`items` 按币种设置在服务端筛选
- [x] PWA 设置页：配对表单 + 设备设置面板；手动 Token 收进「固件调试用」折叠区
- [x] `firmware/README.md` 更新接口约定；《固件对接手册》docx 交给合作者
- [ ] 线上实机验证：设备配对 → 改设置 → 设备生效

## 阶段 2：固件（Arduino IDE + ESP32-WROOM-32）

- [x] 确定框架：**Arduino IDE**（Arduino-ESP32 core），合作者本地用 IDE，云端用同一个 core 的 `arduino-cli` 编译，保证结果一致
- [x] 确定首块硬件：**ESP32-WROOM-32**（经典 ESP32，FQBN `esp32:esp32:esp32`）
- [x] 确定屏幕型号：0.96" SSD1306 128×64 I²C OLED（SDA 21 / SCL 22 / 0x3C）
- [x] 原型：直连 DeepSeek 显示余额（`firmware/Esp32`，已验证屏幕和网络）
- [ ] 改为 Arduino 工程结构（`firmware/balance_display/balance_display.ino`）+ `secrets.h` / `secrets.example.h`
- [ ] 去掉固件里的 DeepSeek Key，改为请求 `/api/device/balance`
- [x] 配网：WiFiManager 热点配 WiFi，存 NVS（ver 0.2，2026-10-23；待改：断网后配网门户不超时会卡住、热点名改为 Balance-XXXX）
- [ ] 配对：屏幕显示 6 位配对码，轮询拿 Token 存 NVS；401 时清 Token 重新配对
- [ ] 应用 `cfg`：刷新间隔、亮度、旋转
- [ ] HTTPS 根证书校验（替换开发期的 `setInsecure()`）
- [ ] 屏幕显示：余额、币种、更新时间、离线 / 旧数据标记

## 阶段 3：固件分发（免本地编译环境）

- [ ] GitHub Actions：推送后用 `arduino-cli` 自动编译固件
- [ ] 打 tag 时发布 GitHub Release（`.bin` + `manifest.json`）
- [ ] Release 后触发 Vercel Deploy Hook，构建时把固件下载到 `web/public/firmware/`
- [ ] 网页烧录页（ESP Web Tools，需桌面版 Chrome / Edge）
- [ ] OTA：设备检查 `manifest.json` 版本号后自动升级

## 阶段 4：屏幕图片（PWA 里的图片转换工具）

- [ ] PWA 新页面：导入 GIF / PNG / JPG
- [ ] 裁剪到屏幕分辨率（分辨率随屏幕型号可选）
- [ ] 黑白化（阈值 / 抖动可调），实时预览
- [ ] 生成 C++ 数组（`const uint8_t PROGMEM`），一键复制或下载 `.h`
- [ ] GIF 多帧：逐帧导出为帧数组 + 帧间隔
- [ ] 固件端：显示图片 / 播放帧动画的示例

## 待定 / 以后

- [ ] 支持更多硬件（新芯片 / 新屏幕），CI 按板型分别编译
- [ ] 更多服务商：OpenRouter、Moonshot（有余额接口）；OpenAI / Anthropic（只有用量，需手动填充值额）
- [ ] 替换默认图标：favicon、PWA 图标、iOS 主屏图标（项目所有者自己做）
- [ ] Vercel Function Region 改到 Atlas 所在地区（目前在 iad1，冷启动约 3 秒）
- [ ] 余额历史曲线（新建时间序列集合 `balance_snapshots`）
- [ ] 低余额提醒
- [ ] 用户池（替换共用密码）
