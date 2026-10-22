# firmware/

ESP32 固件目录。**框架和硬件还没定**（PlatformIO + Arduino 或 ESP-IDF，由硬件负责人决定），定下来后在这里初始化工程。

不管用哪种框架，固件只需要对接下面这一个接口。

## 设备接口约定

```
GET https://lab.taplis.me/api/device/balance
Authorization: Bearer dev_xxxxxxxxxxxxxxxx
```

- 设备 Token 在 PWA「设置 → 设备 → 添加」里生成，**只显示一次**。配网时和 WiFi 一起填进设备，存在 NVS 里，不要写死在代码里。
- 服务端会缓存余额 5 分钟，设备轮询间隔建议 **≥ 5 分钟**，更频繁也拿不到更新的数据。
- 需要 HTTPS。开发阶段可以先用 `setInsecure()` 跑通，正式版要换成内置根证书校验（根证书以 `lab.taplis.me` 实际证书链为准，浏览器里点锁图标可以看到）。

### 成功响应 `200`

```json
{
  "t": 1792656000,
  "items": [
    { "p": "deepseek", "cur": "CNY", "total": 110.0, "ok": true, "stale": false }
  ]
}
```

| 字段 | 类型 | 含义 |
|---|---|---|
| `t` | number | 服务器当前 Unix 时间（秒），可以顺便用来校时 |
| `items[].p` | string | 服务商 id，目前只有 `deepseek` |
| `items[].cur` | string | 币种：`CNY` / `USD` |
| `items[].total` | number | 可用余额（含赠送） |
| `items[].ok` | boolean | 服务商认为余额是否足够继续调用 |
| `items[].stale` | boolean | `true` 表示服务端这次没拉到新数据，显示的是旧缓存，屏幕上可以加个标记 |

`items` 可能为空数组（还没在 PWA 里配置 API Key），屏幕上应提示「未配置」。

### 错误响应

| 状态码 | 含义 | 设备该怎么做 |
|---|---|---|
| `401` | Token 无效或设备已在 PWA 里被删除 | 屏幕提示重新配网，停止轮询 |
| `5xx` / 超时 | 服务端或网络问题 | 保留上次的数字，退避重试 |

## 固件分发（待实现）

GitHub Actions 编译 → 发布到 GitHub Release → Vercel 构建时下载到 `lab.taplis.me/firmware/`，网页烧录页和 OTA 都从这里取。详见根目录 `DEVELOPMENT_CHECKLIST.md`。
