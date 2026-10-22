# firmware/

ESP32 固件目录。

- **开发环境**：Arduino IDE（Arduino-ESP32 core）。云端 CI 用同一个 core 的 `arduino-cli` 编译，和本地 IDE 结果一致
- **首块硬件**：ESP32-WROOM-32（Arduino IDE 里选 **ESP32 Dev Module**，FQBN `esp32:esp32:esp32`）+ 0.96" SSD1306 128×64 I²C OLED（SDA=21, SCL=22, 地址 0x3C）
- 工程结构按 Arduino IDE 规则：`.ino` 文件与所在文件夹同名，例如 `firmware/balance_display/balance_display.ino`
- 私密配置放 `secrets.h`（已被 .gitignore 排除）：**服务器地址**、开发期写死的 WiFi 密码 / 设备 Token。仓库里只提交 `secrets.example.h` 模板，实际地址找仓库所有者要
- **固件里不放任何 AI 服务商的 API Key**：余额统一从我们的服务器取，Key 只存在服务器上

完整的上手说明见仓库所有者另发的《固件对接手册》。下面是接口约定，是固件和服务器之间唯一的契约。

## 总体流程

```
开机
 ├─ NVS 里没有 WiFi ──> 开热点「Balance-XXXX」，手机连上后在弹出页面选 WiFi（WiFiManager）
 ├─ NVS 里没有设备 Token ──> 配对流程（见下）
 └─ 都有 ──> 每 cfg.refresh 秒请求一次 /api/device/balance，显示余额，应用 cfg 里的设置
```

所有请求都是 HTTPS，基础地址 `https://<服务器域名>`（下文省略）。

## 1. 配对（设备没有 Token 时）

### 1.1 申请配对码

```
POST /api/device/pair/start
```
无需请求体和鉴权。成功 `200`：

```json
{ "code": "123456", "secret": "pair_xxxxxxxx", "expiresIn": 600, "poll": 5 }
```

| 字段 | 含义 |
|---|---|
| `code` | 6 位数字，**显示在屏幕上**，用户在 PWA「设置 → 设备 → 配对新设备」里输入 |
| `secret` | 轮询用的临时密钥，存在内存里即可，**不要显示** |
| `expiresIn` | 有效期（秒），过期后重新申请 |
| `poll` | 建议轮询间隔（秒） |

`429`：同一网络下未完成的配对请求太多，等几分钟再试。

### 1.2 轮询配对结果

```
POST /api/device/pair/poll
Authorization: Bearer pair_xxxxxxxx
```

| 状态码 | 响应 | 设备该怎么做 |
|---|---|---|
| `200` | `{ "status": "pending" }` | 用户还没输入配对码，`poll` 秒后再问 |
| `200` | `{ "status": "paired", "token": "dev_xxx", "name": "书桌" }` | **把 `token` 存进 NVS**，进入正常模式；`name` 可以在屏幕上显示一下 |
| `404` | `{ "status": "expired" }` | 配对码过期或无效，回到 1.1 重新申请 |

`token` 只会返回一次，设备收到后必须立刻保存。

## 2. 获取余额和设置（正常模式）

```
GET /api/device/balance
Authorization: Bearer dev_xxxxxxxx
```

### 成功响应 `200`

```json
{
  "t": 1792656000,
  "items": [
    { "p": "deepseek", "cur": "CNY", "total": 6.36, "ok": true, "stale": false }
  ],
  "cfg": { "v": 2, "refresh": 300, "bright": 255, "flip": false, "cur": "auto" }
}
```

| 字段 | 类型 | 含义 |
|---|---|---|
| `t` | number | 服务器当前 Unix 时间（秒），可以顺便用来校时 |
| `items` | array | **已按用户设置筛选好**的余额列表，设备按顺序显示即可 |
| `items[].p` | string | 服务商 id，目前只有 `deepseek` |
| `items[].cur` | string | 币种：`CNY` / `USD` |
| `items[].total` | number | 可用余额（含赠送） |
| `items[].ok` | boolean | 服务商认为余额是否足够继续调用 |
| `items[].stale` | boolean | `true` = 服务器这次没拉到新数据，显示的是旧缓存，屏幕上可以加个标记 |
| `cfg.v` | number | 设置版本号，用户每改一次设置 +1。和上次不同才需要重新应用 |
| `cfg.refresh` | number | 下次请求前等待的秒数（300-86400），**替代固件里写死的间隔** |
| `cfg.bright` | number | 屏幕亮度 0-255（SSD1306 用 `ssd1306_command(SSD1306_SETCONTRAST)` 设置） |
| `cfg.flip` | boolean | `true` = 屏幕旋转 180°（Adafruit GFX：`setRotation(2)`） |
| `cfg.cur` | string | 用户选的币种筛选，仅供参考，筛选服务器已经做好了 |

`items` 可能为空数组（还没在 PWA 里配置 API Key），屏幕上应提示「未配置」。

### 错误响应

| 状态码 | 含义 | 设备该怎么做 |
|---|---|---|
| `401` | Token 无效，或设备已在 PWA 里被删除 | **清掉 NVS 里的 Token**，回到配对流程 |
| `5xx` / 超时 | 服务器或网络问题 | 保留上次的数字，30 秒、60 秒、120 秒…逐步退避重试，最长不超过 `cfg.refresh` |

## 3. 开发调试用：手动 Token

固件开发阶段不想每次都走配对，可以在 PWA「设置 → 设备 → 手动生成设备 Token（固件调试用）」生成一个 `dev_` Token，写进 `secrets.h` 直接用。正式流程仍以配对为准。

## 4. 其他约定

- 服务器余额缓存 5 分钟，所以 `cfg.refresh` 下限就是 300 秒，更频繁也拿不到新数据
- HTTPS：开发阶段可以 `setInsecure()`，正式版改为内置根证书校验（以服务器实际证书链为准）
- 接口字段**只增不改**：以后加新字段时，旧固件忽略不认识的字段即可继续工作

## 固件分发（待实现）

GitHub Actions 编译 → 发布到 GitHub Release → Vercel 构建时下载到站点的 `/firmware/` 路径，网页烧录页和 OTA 都从这里取。详见根目录 `DEVELOPMENT_CHECKLIST.md`。
