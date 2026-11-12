# Contributing to TTZ Web

TTZ Web 使用 Next.js 16、React 19、Tailwind CSS v4、shadcn/ui、TanStack Query 和 Zod。

## 开发

从仓库根运行：

```bash
pnpm install
pnpm --filter @ttz/web dev
```

提交前运行：

```bash
pnpm typecheck
pnpm build
```

## 代码组织

- 公开页：`src/app/(external)`。
- 工作台：`src/app/(main)/dashboard`。
- 路由交互代码就近放置；只有真实复用时再上移。
- 通用 UI 使用 `src/components/ui` 中的 shadcn 组件。
- API 使用 `src/lib/api-client.ts` 和 `@ttz/contracts` 的 Zod schema。
- 服务端契约变更必须同步更新 `ttz-server/packages/contracts`。

## 约束

- 权限必须由后端 Guard/业务服务最终执行；前端隐藏按钮不是权限控制。
- 普通成员报名修改/取消规则不能只写在 UI。
- 不在本期加入站位图或团本准备事项。
- 不提交微信、WCL、数据库、COS 等密钥。
- UI 使用语义主题变量，并覆盖加载、空数据、错误和禁用状态。
- 提交使用 Conventional Commits；新增或大改页面应附明暗主题截图。
