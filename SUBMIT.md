# 提交到 Obsidian 社区目录

## 已经就绪的

| 项目 | 状态 |
|---|---|
| 仓库 | https://github.com/kiefeng/merchart |
| manifest 版本 | 1.0.0 |
| GitHub release | tag `1.0.0`（不带 v），附 `main.js`、`manifest.json`、`styles.css` |
| tag 与版本号 | 一致 |
| LICENSE | MIT |
| README | 英文 + 中文两份 |
| versions.json | 已存在 |

官方要求的前两步（代码上 GitHub、建 release）都完成了，只剩第三步。

## 操作步骤

1. 打开 https://community.obsidian.md ，用 **Obsidian 账号**登录。
   注意这不是 GitHub 账号，是 obsidian.md 官网的账号；没注册过就现场注册一个，邮箱验证即可。

2. 进个人资料，**关联 GitHub 账号**（kiefeng）。
   这一步是让目录确认 `kiefeng/merchart` 确实是你的仓库，授权一次就行。

3. 找到 **Submit plugin** 或 **Add plugin** 入口，填仓库地址：

   ```
   kiefeng/merchart
   ```

4. 目录会自己读仓库默认分支上的 `manifest.json`，再核对 release 里的文件。确认信息无误后提交。

## 可能被问到的字段

| 字段 | 值 |
|---|---|
| Repository | `kiefeng/merchart` |
| Plugin ID | `merchart` |
| Name | `Merchart` |
| Description | 自动从 manifest 读取，不用手填 |

## 提交之后

- 会先跑自动审核，页面上直接列出需要修正的点。
- 有问题就改仓库，把 `manifest.json` 的 version 加一，打一个对应 tag 的新 release，再提交一次。
- 全部通过后插件出现在目录里，用户在 Obsidian 的「第三方插件」里搜索就能直接安装。

## 容易踩的点

- `id` 里不能出现 `obsidian` 这个词，我们的 `merchart` 没问题。
- `manifest.json` 的 `version` 必须和 release 的 tag 完全一致，**tag 不能带 v 前缀**：写 `1.0.0`，不能写 `v1.0.0`。这是提交时最常见的卡点。
- 每次发新版本，都要同时：改 manifest 版本 → 打同 tag 的 release（不带 v）→ 传三个附件。少一步用户在 Obsidian 里更新就会失败。
