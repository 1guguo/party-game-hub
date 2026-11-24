# 阿里云服务器连接与操作指南 (AI Agent & Developer Guide)

本文档专为 **AI 智能体 (AI Agents)** 与 **开发者** 编写。任何获取本文件的 AI 均可依据下述标准规范、密钥路径及安全边界，直接连接服务器进行远程操作、日志审查与服务运维。

---

## 一、 服务器基础连接信息 (Credentials)

| 配置项 | 参数值 | 说明 |
| :--- | :--- | :--- |
| **公网 IP** | `47.251.26.108` | 阿里云轻量/ECS 服务器 |
| **解析域名** | `ysgg.abrdns.com` | 已配置 Nginx 反代各服务 |
| **SSH 端口** | `22` | 标准 SSH 端口 |
| **登录用户** | `root` | 最高管理员权限 |
| **本地私钥路径** | `D:\game\aliyun_kit\gemini.pem` | 备用路径：`D:\game\gemini.pem` |

> 💡 **给 AI Agent 的权限提示**：  
> 若你在 Linux/macOS 环境下运行，调用私钥前请先执行权限修复：`chmod 400 <私钥路径>`；  
> 在 Windows 环境下（PowerShell / CMD），可直接携带 `-i D:\game\aliyun_kit\gemini.pem`。

---

## 二、 AI Agent 非交互式连接标准命令 (Ready-to-use Commands)

为了防止 SSH 首次连接时因 `Host key verification` 提示而导致 AI 终端任务挂起，**必须始终携带 `-o StrictHostKeyChecking=no` 参数**。

### 1. 执行单条远程 Shell 命令
```bash
ssh -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no root@47.251.26.108 "<你的Linux命令>"
```

### 2. 上传文件到服务器 (SCP)
```bash
scp -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no <本地文件路径> root@47.251.26.108:<远程目录路径>
```

### 3. 从服务器下载文件到本地 (SCP)
```bash
scp -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no root@47.251.26.108:<远程文件路径> <本地文件路径>
```

---

## 三、 ⚠️ 核心红线与安全隔离边界 (P0 Strict Rules)

连接服务器后，**任何 AI 必须无条件遵守以下项目隔离规则**：

```
                    【47.251.26.108 服务器架构】
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
【禁止修改 ⛔】                                    【主维护项目 🎮】
服务名: love-story.service                        服务名: party-game.service
端口: 3001                                        端口: 3002
路径: /opt/love-story/                            路径: /opt/party-game-hub/
网址: http://ysgg.abrdns.com/                     网址: http://ysgg.abrdns.com/game/
说明: 恋爱日记网站，严禁停止或变更！              说明: 多人联机聚会游戏大厅 + AI陪玩
```

* ⛔ **严禁破坏 3001 端口服务**：绝对禁止 `kill`、`restart`、修改 `/opt/love-story/` 下的任何文件及配置！
* 🎮 **聚会大厅仅限 3002 端口**：所有的聚会游戏代码、AI 陪玩配置均在 `/opt/party-game-hub/`。

---

## 四、 如何查看服务器上的所有对话与日志 (Chat & Logs Inspection)

### 1. 聚会大厅（Party Game Hub）的玩家与 AI 交互对话
聚会游戏大厅所有房间的创建、加入、公屏聊天以及 AI 陪玩的台词均由 Node.js 服务托管：

* **实时监听最新的房间动态与聊天消息 (Follow Mode)**：
  ```bash
  ssh -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no root@47.251.26.108 "journalctl -u party-game -f"
  ```
* **查看最近 100 行聊天与系统日志**：
  ```bash
  ssh -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no root@47.251.26.108 "journalctl -u party-game -n 100 --no-pager"
  ```
* **检查游戏服务健康状态与活跃房间数**：
  ```bash
  ssh -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no root@47.251.26.108 "curl -s http://localhost:3002/health"
  ```

### 2. 服务器上的其他对话系统 (OpenClaw / QQBot / Bisheng)
* **OpenClaw 机器人目录**：`/opt/openclaw/` 与 `/home/admin/.openclaw/`
* **Bisheng 大模型平台**：`/home/admin/bisheng/`
* **查看其他服务运行状态**：
  ```bash
  ssh -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no root@47.251.26.108 "systemctl list-units --type=service --state=running"
  ```

---

## 五、 聚会大厅标准部署与运维流程 (Standard Workflow)

当 AI Agent 需要修复 Bug 或上线新功能时，请遵循以下标准流水线：

1. **本地代码目录**：`D:\game\party-game-hub\`
2. **GitHub 开源仓库**：`https://github.com/1guguo/party-game-hub`（分支：`main`）
3. **部署至远程**：
   ```powershell
   # 示例：同步核心文件至云端
   scp -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no D:\game\party-game-hub\server.js D:\game\party-game-hub\ai-companion.js D:\game\party-game-hub\app.js D:\game\party-game-hub\styles.css D:\game\party-game-hub\index.html root@47.251.26.108:/opt/party-game-hub/
   ```
4. **远程语法校验与平滑重启**：
   ```bash
   ssh -i D:\game\aliyun_kit\gemini.pem -o StrictHostKeyChecking=no root@47.251.26.108 "node -c /opt/party-game-hub/server.js && systemctl restart party-game && systemctl is-active party-game && curl -s http://localhost:3002/health"
   ```
5. **提交并推送到 GitHub 备份**：
   ```powershell
   git -C D:\game\party-game-hub add .
   git -C D:\game\party-game-hub commit -m "feat/fix: <你的改动说明>"
   git -C D:\game\party-game-hub push
   ```

---

## 六、 人工开发者可视化连接方式

如果人类开发者需要使用桌面工具连接：
* **工具推荐**：Termius、Xshell、FinalShell、MobaXterm、VSCode Remote-SSH。
* **配置方式**：
  * Host: `47.251.26.108`
  * Port: `22`
  * User: `root`
  * Authentication: 选择私钥文件，导入本地 `D:\game\aliyun_kit\gemini.pem` 即可直连。
