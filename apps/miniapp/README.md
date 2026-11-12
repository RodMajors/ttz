# TTZ 微信小程序

原生微信小程序 + TypeScript。页面位于 `miniprogram/pages`，共享请求与会话逻辑位于 `miniprogram/lib`。

## 页面

- `index`：微信登录、审核状态和网页二维码扫描。
- `login-confirm`：网页登录二次确认/取消。
- `activities`：近期活动列表。
- `activity-detail`：报名、修改和取消。
- `activity-create`：已审核成员快捷创建活动草稿。
- `profile`：资料维护和退出登录。

## 会话

`lib/api.ts` 保存 access/refresh token，401 时只进行一次并发 refresh，轮换失败即清理本地会话。AppSecret 与 session_key 只存在后端。

## 开发

1. 使用微信开发者工具打开本目录。
2. 填写 AppID；不要提交 `project.private.config.json`。
3. 修改 `miniprogram/config.ts` 的 API 地址。生产和真机使用已备案 HTTPS 域名。
4. 在仓库根运行 `pnpm typecheck` 验证小程序 TypeScript。
