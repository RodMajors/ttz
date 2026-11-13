# TTZ 微信小程序

在微信开发者工具中打开本目录（`apps/miniapp`）。受版本控制的 TypeScript、JSON、WXML、WXSS 源码位于 `src/miniprogram`；`miniprogram/` 是构建产物。打开或刷新项目前先运行：

```sh
pnpm --filter @ttz/miniapp build
```

需要在本机 API 上免微信扫码登录时，在 `ttz-server/.env` 中设置 `ALLOW_LOCAL_DEV_LOGIN=true`，然后创建固定的本地开发管理员并构建带开发登录按钮的版本：

```sh
pnpm --filter @ttz/miniapp build:local
```

本地登录接口只在开发环境显式启用，并且只接受本机回环请求。它为固定测试账号签发普通、可撤销的 TTZ 会话，不使用身份伪造请求头。上传小程序前请使用普通 `build` 命令重新构建。
