# TTZ 前端

TTZ（The Twilight Zone）公会站的 Web 工作台和原生微信小程序。NestJS API 与数据库代码维护在同级的 ttz-server 仓库，需求和设计文档位于同级 docs 目录。

## 目录结构

- apps/web：Next.js 公开站和桌面工作台，使用 React、Tailwind CSS、shadcn/ui 和 TanStack Query。
- apps/miniapp：原生微信小程序入口，承载微信登录、扫码确认和快捷活动流程。
- packages/contracts：前端使用的 Zod 数据结构与业务枚举，接口变更时需与后端同步。

后端 API、Worker、Prisma 和服务端环境配置已全部迁移至 `../ttz-server`，本仓库不保留后端副本。

## 本地开发

使用 Node.js 26.13.1 和 pnpm 12.18.0。安装依赖后运行 pnpm dev，Web 默认访问 http://localhost:3000。将 .env.example 中的 NEXT_PUBLIC_API_BASE_URL 配置为后端 API 地址；本地默认是 http://localhost:3001/api。

后端需要在 ttz-server 中独立配置和启动。小程序需使用微信开发者工具打开 apps/miniapp，并配置自己的 AppID 和合法请求域名。

## 验证与提交

pnpm typecheck 检查前端 workspace；pnpm build 构建 Web。根目录的 Husky pre-commit 对暂存文件执行 lint-staged，并运行 workspace 类型检查。提交使用 Conventional Commits。

## 数据库

本仓库不负责数据库迁移。已执行的提醒与出勤 SQL 已归档到同级 docs 目录；后续迁移由 ttz-server 维护，生产执行前必须备份、核对现有结构并在隔离环境演练。
