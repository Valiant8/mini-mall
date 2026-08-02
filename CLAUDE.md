# Mini Mall

微型电商全栈项目，Next.js 16 App Router + Prisma + SQLite + TailwindCSS 4。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.12 | 全栈框架，App Router + Turbopack |
| React | 19.2.4 | Server Components + Server Actions |
| TypeScript | ^5 | 严格模式 |
| Prisma | 5.22.0 | ORM，SQLite |
| Auth.js | 5.0.0-beta.32 (`next-auth@beta`) | 认证，Credentials Provider + JWT |
| TailwindCSS | ^4 | CSS-first 配置，`@theme` 指令，OKLCH 色域 |
| zod | ^4.4.3 | 服务端输入校验 |
| bcryptjs | ^3.0.3 | 密码哈希 |

## 项目结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页（商品列表）
│   ├── globals.css             # Tailwind v4 @theme 配置
│   ├── products/
│   │   ├── page.tsx            # 商品搜索+分类筛选
│   │   └── [id]/page.tsx       # 商品详情
│   ├── cart/page.tsx           # 购物车
│   ├── orders/
│   │   ├── page.tsx            # 我的订单
│   │   └── [id]/page.tsx       # 订单详情
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── admin/
│   │   ├── layout.tsx          # 后台布局 + 权限校验
│   │   ├── page.tsx            # Dashboard
│   │   ├── products/           # 商品 CRUD
│   │   ├── categories/         # 分类 CRUD
│   │   ├── orders/             # 订单管理
│   │   └── membership/         # 心悦会员等级配置
│   └── api/auth/[...nextauth]/route.ts
├── components/
│   ├── ui/                     # 通用 UI 组件
│   ├── layout/                 # Header, Footer, Sidebar
│   ├── product/                # ProductCard, ProductGrid, SearchBar
│   ├── cart/                   # CartItem, CartSummary
│   └── admin/                  # AdminTable, AdminForm
├── lib/
│   ├── prisma.ts               # Prisma 单例
│   ├── auth.ts                 # Auth.js 配置
│   ├── validators.ts           # Zod schemas
│   └── utils.ts
└── proxy.ts                    # Auth.js 路由保护（Next.js 16 改名）
prisma/
├── schema.prisma
├── seed.ts
└── dev.db
```

## 数据模型

7 个模型：`User`、`MembershipTier`、`Category`、`Product`、`CartItem`、`Order`、`OrderItem`（详见 `prisma/schema.prisma`）。

关键关系：
- User 1:N Order, User 1:N CartItem
- Category 1:N Product
- Order 1:N OrderItem, Product 1:N OrderItem
- CartItem N:1 User, CartItem N:1 Product

## 核心约定

### 数据访问
- **全部 Server Actions**：表单提交、数据变更统一用 `"use server"` 函数
- **不额外创建 API Route**，除非 Auth.js 路由或外部回调需要
- Prisma 单例见 `src/lib/prisma.ts`，开发环境热重载用 `globalThis` 缓存

### 认证
- Auth.js v5 Credentials Provider，`src/lib/auth.ts` 统一导出 `auth` / `signIn` / `signOut`
- Server Component 用 `await auth()` 获取 session
- `proxy.ts` 保护 `/admin/*` 和 `/cart`、`/orders` 路由
- 管理员 seed 账号：`admin@minimall.com`

### 悦会员体系

等级 | 累计消费门槛 | 折扣率 | 折扣说明
---|---|---|---
心悦1级 | ¥9,000 | 0.95 | 9.5折
心悦2级 | ¥12,000 | 0.85 | 8.5折
心悦3级 | ¥14,000 | 0.95 | 6.5折

核心逻辑（**所有数值从 `MembershipTier` 表读取，不硬编码**）：
1. 下单时 —— 查 `User.membershipLevel` → 查 `MembershipTier.discount` → 计算 `Order.discount` 和 `Order.total`
2. 支付后 —— 累加 `User.totalSpent`，遍历 `MembershipTier` 表判断是否升级
3. 后台 `/admin/membership` 可改阈值和折扣率，即时生效

### 订单状态流转

```
pending → paid → shipped → completed
                ↘ cancelled
```

模拟支付：用户点击"支付"直接标记 `pending → paid`。

### 文件命名
- 页面文件：kebab-case 目录 + `page.tsx`
- 组件文件：PascalCase，如 `ProductCard.tsx`
- 工具文件：camelCase，如 `validators.ts`

## 常用命令

```bash
npm run dev              # Turbopack 开发服务器
npm run build            # 生产构建
npx prisma studio        # 数据库浏览器
npx prisma migrate dev   # 生成迁移
npx prisma db seed       # 填充种子数据
npx prisma generate      # 重新生成 Prisma Client
```

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
