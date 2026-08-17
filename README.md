# Supabase Todo Demo

一个用于课堂演示的最小 Todo Web 应用。浏览器通过 Supabase JavaScript SDK 直接调用自动生成的 Data API，数据存储在 Supabase 托管的 PostgreSQL 中。

## 这个 Demo 展示什么

- `SELECT`：读取 Todo 列表
- `INSERT`：添加任务
- `UPDATE`：切换完成状态
- `DELETE`：删除任务、清除已完成任务
- RLS（Row Level Security）：控制 publishable key 能访问哪些数据
- 环境变量：在前端项目中配置 Project URL 和 publishable key

## 1. 创建数据库表

打开 Supabase 项目，进入 **SQL Editor**，复制并运行 [`supabase/schema.sql`](./supabase/schema.sql) 的全部内容。脚本会：

1. 创建 `public.todos` 表；
2. 开启 RLS；
3. 为 `anon` 角色创建课堂演示所需的增删改查策略；
4. 插入三条示例数据（仅当表为空时）。

> 注意：为了让学员无需登录即可操作，这个示例允许匿名访客读写所有 Todo。它适合课堂演示，不适合直接用于生产环境。真实应用应接入 Supabase Auth，并把策略限制为用户只能访问自己的数据。

## 2. 配置项目凭据

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=https://你的项目ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_你的key
```

Project URL 和 publishable key 可以从 Supabase Dashboard 的 **Connect** 对话框或 **Settings → API Keys** 找到。publishable key 可以放在浏览器端；不要把 secret key 或旧版 `service_role` key 放进前端项目。

## 3. 本地运行

需要 Node.js 22.12+（当前 Supabase JavaScript SDK 要求 Node.js 22+）。

```bash
npm install
npm run dev
```

打开终端提示的本地地址，通常是 <http://localhost:5173>。

生产构建验证：

```bash
npm run build
npm run preview
```

## 课堂讲解路线

1. 在 Supabase 的 **Table Editor** 查看 `todos` 表和三条种子数据。
2. 打开 [`src/supabase.ts`](./src/supabase.ts)，说明 URL + publishable key 如何初始化客户端。
3. 打开 [`src/todo-service.ts`](./src/todo-service.ts)，逐个讲解 `select`、`insert`、`update`、`delete`。
4. 在网页添加或勾选任务，再回到 Table Editor 刷新，观察数据库变化。
5. 在 **Authentication → Policies** 查看 RLS 策略，解释为什么 publishable key 不是数据库管理员密钥。
6. 临时禁用某条策略，再操作网页，观察请求被数据库拒绝，以此说明 RLS 的作用。

## 项目结构

```text
├── supabase/schema.sql   # 建表、RLS 策略、种子数据
├── src/supabase.ts       # Supabase 客户端初始化
├── src/todo-service.ts   # 数据库 CRUD 操作
├── src/main.ts           # 页面状态与交互
├── src/style.css         # 页面样式
└── .env.example          # 环境变量模板
```

## 常见问题

**页面提示 `Invalid API key`**

检查是否使用 publishable key，复制时不要带多余空格，并在修改 `.env.local` 后重启开发服务器。

**能读取数据，但不能更新或删除**

确认已完整执行 `supabase/schema.sql`。Supabase 开启 RLS 后，没有对应 policy 的操作会被拒绝；`UPDATE` 同时还依赖 `SELECT` policy。

**为什么 key 放在前端不会泄密？**

publishable key 本来就用于公开客户端，它只代表低权限的 `anon` 角色。真正的数据访问边界由 RLS policy 决定。secret key / `service_role` 会绕过 RLS，绝不能放在浏览器端。

## 官方资料

- [Supabase JavaScript 客户端初始化](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
