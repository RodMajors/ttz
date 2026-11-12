# TTZ 前端仓库

TTZ（The Twilight Zone）公会站的公开 Web、桌面工作台和原生微信小程序。NestJS API、BullMQ Worker、Prisma 与服务端配置位于同级 `ttz-server` 仓库；需求、设计和数据库评审脚本位于同级 `docs` 目录。

## 为什么分成两个 Monorepo

`ttz` 和 `ttz-server` 都各自是 pnpm + Turborepo Monorepo。Monorepo 指一个仓库内管理多个应用或共享包，并不要求前后端必须处于同一个 Git 仓库。当前拆分让前端发布、小程序开发和服务端部署可以独立演进，同时保留各自仓库内的共享包和统一质量门禁。

跨仓边界使用 REST + Swagger。`packages/contracts` 是前端运行时解析所需的 Zod 副本；接口变更必须与 `ttz-server/packages/contracts` 在同一功能阶段同步，CI 前可使用 `git diff --no-index` 核对。

## 目录结构

```text
ttz/
├─ apps/
│  ├─ web/                 Next.js 16 公开站与桌面工作台
│  └─ miniapp/             原生微信小程序 + TypeScript
├─ packages/
│  └─ contracts/           前端 DTO、枚举和 Zod 响应解析
├─ .github/workflows/      前端 CI
├─ .husky/                 提交前类型检查与 lint-staged
├─ pnpm-workspace.yaml     只包含 web、miniapp、contracts
└─ turbo.json              构建与类型检查任务
```

本仓库不再包含 `apps/api`、`apps/worker`、`packages/database` 或 `packages/config`。Windows 上可能因为编辑器/终端句柄暂时看到空目录壳，但其中没有源码，也不受 Git 管理。

## 已实现的首期页面

- 公开站：`/`、`/progress`、`/recruitment`、`/login`。
- 成员状态：`/member-status`。
- 工作台：`/dashboard/default`。
- 活动：列表、创建/编辑、详情、报名/修改/取消、负责人审批、名单锁定。
- 成员：成员列表、搜索/身份组筛选、待审核、身份组、privilege。
- 出勤/WCL：本人统计、活动记录、人工确认、WCL 报告、角色匹配和建议确认。
- 运营：公告、工具链接、公开内容和联系方式设置。
- 个人中心：资料、角色创建/编辑/设主角色/退役、通知偏好。

Studio Admin 的主题、侧边栏和布局基础被保留；CRM、财务、电商、聊天、邮件等示例业务路由已经删除。

## 本地开发

要求 Node.js 26.13.1 与 pnpm 12.18.0。

```bash
pnpm install
pnpm dev
```

复制 `.env.example` 为 `.env.local`，配置：

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Web 默认监听 `http://localhost:3000`。跨域 Cookie 联调时，Web URL 必须与后端 `WEB_ORIGIN` 完全一致。

## 微信小程序

用微信开发者工具打开 `apps/miniapp`。

1. 在项目私有配置中填写 AppID。
2. 本地开发可使用 `miniprogram/config.ts` 的 localhost；真机和生产必须改为已备案 HTTPS API 域名。
3. 服务端配置 `WECHAT_APP_ID` 与 `WECHAT_APP_SECRET`。
4. 小程序登录使用短期 access token 和可轮换 refresh token；二维码确认页只提交短期 `loginNo`，不会收到 Web Cookie、openid 或 session_key。

小程序首期只承担微信身份、扫码确认、活动列表/详情/报名和快捷创建；复杂名单、出勤与系统设置保留在桌面 Web。

## 数据导出

活动出勤详情可导出 CSV 或 XLSX。文件只包含当前接口已授权返回的记录：普通成员只能导出本人，负责人/管理员可导出该活动完整成员池。XLSX 在浏览器内生成，不上传或缓存到服务端。

## 验证、CI 与提交

```bash
pnpm typecheck
pnpm build
```

GitHub Actions 使用 Node 26.13.1 / pnpm 12.18.0 执行安装、类型检查和生产构建。Husky pre-commit 对暂存的 Web、小程序和 contracts 文件运行 Biome，并执行全 workspace 类型检查。提交使用 Conventional Commits。

## 数据库边界

前端仓库不维护或执行数据库迁移。`docs/TTZ-后续迁移-提醒与出勤.sql` 已由维护者执行；后续数据库变更由 `ttz-server` 评审和管理。任何生产变更都必须先备份、核对 `INFORMATION_SCHEMA` 并在结构副本上演练。
