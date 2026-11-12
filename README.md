# TTZ 公会站

TTZ（The Twilight Zone）单公会活动、报名与出勤工作台。

## 工程结构

- apps/web：Next.js 公开站点与 Studio Admin 风格桌面工作台
- apps/api：NestJS REST API，提供 /api/health
- apps/worker：后续承载小程序订阅消息与 WCL 导入
- apps/miniapp：原生微信小程序 + TypeScript 最小页面
- packages/contracts：Zod contracts、出勤状态、权限和活动类型
- packages/database：Prisma schema，映射已执行的 MySQL 表
- packages/config：环境变量 schema

## 本地开发

运行 pnpm install 后执行 pnpm dev。Web 默认在 http://localhost:3000，API 默认在 http://localhost:3001。

复制 .env.example 为 .env；真实 AppID、二维码、邮箱等未准备好时保持为空即可。

## 数据库

初始 SQL 位于 docs/superpowers/ttz，已执行后的提醒与出勤增量迁移草案位于 docs/TTZ-后续迁移-提醒与出勤.sql。后续结构变更必须转换为 Prisma migration。

## 提交

仓库根目录启用了 Husky。提交前会运行 lint-staged，对本次修改的 Web、API 和 contracts 文件执行格式/类型检查。
