# Gemini Music — Docker 镜像使用指南

## 镜像列表

| 镜像名 | 用途 |
|--------|------|
| `934029151/gemini-music-frontend` | Nginx + Vue 3 SPA 前端（端口 80） |
| `934029151/gemini-music-api` | NeteaseCloudMusicApiEnhanced 后端 API（端口 38761） |
| `934029151/gemini-music-unblock` | 音源替换服务（端口 38762/38763） |

## 快速开始

### 前置条件

- Docker 24+ / Docker Compose v2+

### 1. 一键部署（推荐）

创建 `docker-compose.yml`：

```yaml
services:
  nginx:
    image: 934029151/gemini-music-frontend:latest
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - netease-api
      - unblock
    restart: unless-stopped

  netease-api:
    image: 934029151/gemini-music-api:latest
    ports:
      - "38761:38761"
    environment:
      PORT: "38761"
      NODE_ENV: "production"
    restart: unless-stopped

  unblock:
    image: 934029151/gemini-music-unblock:latest
    expose:
      - "38762"
      - "38763"
    environment:
      ENABLE_FLAC: "true"
      PORT: "38763"
      UNBLOCK_SOURCES: "bodian,kugou,migu,qq,bilibili"
    restart: unless-stopped
```

启动：

```bash
docker compose up -d
```

打开浏览器访问 `http://localhost`。

### 2. 单独运行前端

```bash
docker run -d -p 80:80 934029151/gemini-music-frontend:latest
```

访问 `http://localhost`，但需要配合 API 和 unblock 服务才能使用全部功能。

## 架构

```
浏览器 ──→ Nginx:80 ──→ /api/* → Netease API:38761
                    │
                    ├─ /unblock-api/* → Match Server:38763 ─→ Unblock Proxy:38762
                    │
                    ├─ /dl-proxy?url=... → Match Server:38763（代理音频）
                    │
                    └─ /* → SPA index.html（前端路由回退）
```

- **Nginx** 提供 SPA 静态文件服务、API 反向代理、以及 `/dl-proxy` 音频代理
- **Netease API** 提供网易云音乐数据接口
- **Unblock Match Server** 匹配替代音源
- **Unblock Proxy** 转发并替换音频源

## 环境变量

### netease-api

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `38761` | API 服务端口 |
| `NODE_ENV` | `production` | 运行环境 |

### unblock

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ENABLE_FLAC` | `true` | 启用 FLAC 无损音源匹配 |
| `PORT` | `38763` | Match Server 端口 |
| `UNBLOCK_SOURCES` | `bodian,kugou,migu,qq,bilibili` | 音源优先级列表 |

## 数据持久化

当前镜像设计为无状态运行，所有配置通过环境变量注入。会话认证依赖浏览器 Cookie，无需额外持久化。

## HTTPS 配置

参考项目 `deploy/` 目录下的 `nginx.conf` 和 `setup-ssl.sh`：

1. 使用 Let's Encrypt 获取证书
2. 将证书挂载到 Nginx 容器
3. 在 Nginx 配置中启用 SSL

详细步骤见：[HTTPS 配置说明](https://github.com/your-repo/gemini-music-deploy)

## 已知限制

- Unblock 音源匹配依赖外部 CDN（kuwo.cn、migu 等），部分环境可能无法访问
- 前端 JS 包约 1.6MB（未做代码拆分），首次加载可能较慢
- 当前为单机部署设计，高可用场景需自行扩展

## 项目信息

- 技术栈：Vue 3 + Vite + Nginx + Node.js
- 源码：[GitHub 仓库](https://github.com/your-repo/gemini-music)

## Tags

- `latest` — 最新稳定版本