# Quill — 轻量笔记工具

> 基于 Tauri + Vue 3 构建的个人知识管理工具
> 
> 最后更新：2026-04-11 01:52

## 📖 产品简介

一个像记事本一样轻快、像杂志一样好看、像保险箱一样安全的个人知识管理工具。

四层结构：**分类 → 文件 → 内容块 → 内容**

## 🚀 快速开始

```bash
cd quill
npm install
npm run dev          # 浏览器预览（开发模式）
npm run build        # 构建 Web 版本
npm run tauri dev    # Tauri 桌面应用（需 Rust 环境）
```

### 环境要求
- Node.js 18+
- Rust（仅 Tauri 桌面版需要）：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

## 📁 项目结构

```
quill/
├── src/
│   ├── main.js                    # 入口，挂载 Vue app + 引入全局样式
│   ├── App.vue                    # ✅ 主布局（CSS Grid 三栏，支持折叠动画）
│   ├── components/
│   │   ├── Sidebar.vue            # ✅ 左侧栏 - 工作空间/收藏区/折叠图标模式
│   │   ├── FilePanel.vue          # ✅ 中间栏 - 文件列表/搜索/拖拽排序
│   │   ├── ContentPanel.vue       # ✅ 右侧栏 - 内容区/内容块/Markdown编辑
│   │   ├── ContextMenu.vue        # ✅ 右键菜单（文件/分类，Teleport方式）
│   │   ├── BlockMenu.vue          # ✅ 内容块右键菜单
│   │   ├── LockOverlay.vue        # ✅ 密码保护弹层（图案+PIN）
│   │   └── Toast.vue              # ✅ Toast 提示
│   ├── stores/
│   │   └── useStore.js            # ✅ 响应式 store + localStorage 持久化
│   ├── styles/
│   │   └── main.css               # ✅ 全局设计系统
│   └── utils/
│       └── (待添加)
├── package.json
├── vite.config.js
└── index.html
```

---

## ✅ 已完成功能（v2 — 约 85%）

### 核心架构
- [x] **CSS Grid 三栏布局**（220px / 260px / 1fr）
- [x] **侧栏折叠动画**（220px → 52px，0.3s cubic-bezier）
- [x] **文件栏收起/恢复**（0 宽度动画）
- [x] Vue 3 Composition API + 响应式 Store
- [x] localStorage 数据持久化
- [x] 设计系统（字体：Cormorant Garamond + DM Sans + JetBrains Mono）
- [x] 色彩系统（暖白 #faf9f7 / 铁锈红 #c45d3a / 深色区块 #1a1814）

### 左侧栏（工作空间）
- [x] 4 个默认分类（AI 提示词 / 密码&API Keys / 想法记录 / Markdown）
- [x] 分类图标（sparkle / key / bulb / doc）
- [x] 新建分类（内联编辑，自动聚焦 + 自动选中文字）
- [x] 分类拖拽排序
- [x] 分类置顶（小圆点标记）
- [x] 分类折叠为纯图标模式（52px 宽）
- [x] **收藏区** — 位于工作空间下方，显示所有收藏的文件，点击快速跳转

### 中间栏（文件列表）
- [x] 文件显示（名称、内容预览、标签、锁定状态🔒、条目数）
- [x] 新建文件（自动生成默认名称，自动聚焦内容区）
- [x] 文件拖拽排序
- [x] 文件置顶
- [x] 三点更多按钮（hover 显示，点击触发右键菜单）
- [x] 搜索功能（三种范围：当前文件 / 当前分类 / 全局）
- [x] 搜索清除按钮（Escape 键或点击 X）
- [x] 空状态提示 + 创建按钮

### 右侧栏（内容区）
- [x] 面包屑导航（分类 / 文件名）
- [x] 文件标题（Cormorant Garamond 26px）
- [x] 内容块结构（标题 + 折叠/展开 + 操作按钮）
- [x] 内容块折叠/展开（带 transition 动画）
- [x] 新增内容块（+ 按钮，自动聚焦 textarea）
- [x] 展开全部 / 折叠全部
- [x] 复制全部
- [x] 字数统计（右下角浮动）
- [x] Textarea auto-grow（自适应高度）

### 右键菜单
- [x] 文件右键（重命名 / 置顶 / 收藏 / 复制文件 / 密码保护 / 删除）
- [x] 分类右键（重命名 / 置顶 / 删除）
- [x] 内容块右键（重命名 / 收藏 / 删除）
- [x] Teleport 到 body，z-index 正确分层
- [x] 点击外部自动关闭

### 内容块操作
- [x] 标题行左侧：折叠/展开箭头（点击标题行也可切换）
- [x] 标题行右侧：●●● 更多菜单 + 📋 复制按钮
- [x] 操作按钮 hover 时才显示
- [x] 点击内容区进入编辑模式

### 密码保护
- [x] 图案密码（3×3 九宫格，至少 4 点）
- [x] 数字 PIN（4 位，数字键盘）
- [x] 首次设置密码（图案/PIN 二选一）
- [x] 解锁验证（成功/失败动画）
- [x] 验证错误抖动动画
- [x] API Key 暗色区块 + 模糊显示 + 点击解锁

### Markdown
- [x] 自动渲染模式（打开即显示渲染效果）
- [x] 编辑模式（左右分栏：预览 + 源码）
- [x] 实时同步（输入即更新预览）
- [x] 基础语法（标题/粗体/斜体/代码块/引用/列表）

### 动效 & 交互
- [x] 侧栏折叠 0.3s cubic-bezier
- [x] 文件栏收起 0.3s
- [x] 内容块展开/折叠 transition
- [x] 右键菜单 scale 动画
- [x] Toast 浮层动画
- [x] 密码错误抖动
- [x] 新建条目 slideIn 动画

### 其他
- [x] Toast 提示（2 秒自动消失）
- [x] Toast 构建验证通过

---

## ❌ 待开发（剩余 ~15%）

### 高优先级
- [ ] **Tauri 桌面配置** — `src-tauri/` 目录生成（需在有 Rust 的机器执行 `npm run tauri init`）
- [ ] **搜索结果高亮** — 匹配文字高亮显示
- [ ] **搜索时内容块过滤** — 文件内搜索隐藏不匹配的内容块
- [ ] **Markdown 分栏宽度拖拽调整** — 分隔条可拖动

### 中优先级
- [ ] **导入/导出** — 使用 Tauri fs API 读写本地文件
- [ ] **标签自动分配** — 根据分类自动设置 Prompt/Secret/Idea/Markdown 标签
- [ ] **文件/内容块拖拽半透明预览**
- [ ] **快捷键** — Escape 关闭弹窗、Ctrl+N 新建等
- [ ] **文件更新时间显示**

### 低优先级 / 增强
- [ ] 深色模式
- [ ] 全局搜索结果高亮
- [ ] 国际化（中/英）
- [ ] 自动更新
- [ ] 系统托盘

---

## 🎨 设计规范速查

| 项目 | 规格 |
|------|------|
| 侧栏宽度 | 220px（折叠 52px） |
| 文件列表宽度 | 260px（收起 0px） |
| 内容区 | 1fr（弹性） |
| Logo | Cormorant Garamond 22px / weight-300 |
| 文件标题 | Cormorant Garamond 26px / weight-300 |
| 内容块标题 | Cormorant Garamond 16px / weight-500 |
| 正文 | DM Sans 14px / weight-400 |
| 代码 | JetBrains Mono 12-13px / weight-400 |
| 主背景 | #faf9f7 |
| 卡片背景 | #ffffff |
| 强调色 | #c45d3a |
| 强调背景 | #f8f0ec |
| 深色区块 | #1a1814 |
| 危险色 | #c44a3a |
| 成功色 | #4a8c6f |
| 圆角 | 8px（常规）/ 12px（弹窗） |
| 阴影 | sm: 0 1px 3px / md: 0 4px 12px / lg: 0 8px 32px / xl: 0 16px 48px |

---

## 📦 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| v1 | 2026-04-11 01:47 | 初始版本，基础框架 + 所有组件 |
| **v2** | **2026-04-11 01:52** | **全面重写：Grid布局、收藏区、折叠动画、搜索增强、Markdown分栏、Teleport菜单、auto-grow** |
