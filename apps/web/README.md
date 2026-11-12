# TTZ Web

Next.js 16 + React 19 桌面 Web。公开站和内部工作台共享主题系统，内部数据通过 TanStack Query 调用 `NEXT_PUBLIC_API_BASE_URL`，响应由 `@ttz/contracts` 的 Zod schema 校验。

## 路由组织

- `src/app/(external)`：公开主页、进度、招募、扫码登录和成员审核状态。
- `src/app/(main)/dashboard`：受 `AuthBoundary` 保护的内部工作台。
- 各业务路由的交互组件放在路由目录或 `_components` 中。
- `src/components/ui`：shadcn/ui 源码，不在业务页面中复制控件实现。
- `src/lib/api-client.ts`：统一 API envelope、Cookie 请求和 Zod 响应解析。
- `src/navigation/sidebar`：TTZ 导航与最低 privilege 展示规则。

## 认证

`/login` 创建短期二维码会话，浏览器保存一次性 `browserSecret` 并轮询状态。小程序确认后后端写入 HttpOnly、Secure（生产）、SameSite=Strict Cookie。内部页面仍由后端 Guard 做最终鉴权，前端的菜单隐藏不是权限边界。

## 常用命令

```bash
pnpm --filter @ttz/web dev
pnpm --filter @ttz/web typecheck
pnpm --filter @ttz/web build
pnpm --filter @ttz/web start
```

生产构建启用 Next.js standalone 输出。
