# Van Gogh Admin (梵高艺术教育管理系统)

Van Gogh Admin 是一个现代化的艺术教育机构教务管理系统，旨在简化学生管理、课程排期、考勤记录及财务订单处理流程。

## 核心功能

*   **学员管理 (Students)**: 学员档案、报名课程、课时统计、成长记录。
*   **课程管理 (Courses)**: 课程创建、排课、班级花名册、剩余课时监控。
*   **考勤系统 (Attendance)**: 签到/签退、自动扣课时、缺勤/请假记录。
*   **财务订单 (Finance)**: 报名/续费/补缴订单、欠费管理、流水统计。
*   **欠费管理 (Arrears)**: 
    *   支持“先上课后付费”模式，允许课时为负数。
    *   动态计算剩余课时（总购课 - 总消耗）。
    *   欠费学员自动标记（红色高亮、标签提示）。
*   **数据统计**: 支持小数课时（如 1.5 课时），精确记录教学消耗。

## 技术栈

### 前端 (Client)
*   **框架**: React 18, UmiJS 4
*   **UI 组件库**: Ant Design Pro 5
*   **状态管理**: Umi Model / Hooks
*   **请求库**: Umi Request

### 后端 (Server)
*   **框架**: NestJS
*   **语言**: TypeScript
*   **ORM**: TypeORM
*   **数据库**: MySQL 8.0
*   **API 文档**: Swagger / OpenAPI

## 快速开始

### 环境要求
*   Node.js >= 16
*   MySQL >= 8.0
*   pnpm

### 1. 启动后端服务

```bash
cd server

# 安装依赖
pnpm install

# 配置环境变量 (参考 .env.example)
cp .env.example .env

# 启动服务
pnpm start:dev
```

后端服务默认运行在 `http://localhost:3000`

### 2. 启动前端服务

```bash
cd client

# 安装依赖
pnpm install

# 启动开发服务器
pnpm start
```

前端服务默认运行在 `http://localhost:8000`

## 目录结构

```
vangogh_Admin/
├── client/                 # 前端项目 (Ant Design Pro)
│   ├── src/pages/          # 页面组件
│   └── config/             # 项目配置
├── server/                 # 后端项目 (NestJS)
│   ├── src/modules/        # 业务模块 (Orders, Students, etc.)
│   └── src/entities/       # 数据库实体
└── docs/                   # 项目文档
```

## 最近更新 (Latest Updates)

*   **Feature**: 实现了欠费管理系统。
    *   学员详情页和课程详情页新增欠费状态提示。
    *   支持课时透支（负数余额）。
    *   优化了课时计算逻辑，采用动态计算方式确保数据一致性。
*   **Enhancement**: 全局支持小数课时显示（保留2位小数）。
*   **Fix**: 修复了数据库 Schema 中关于考勤索引的冲突问题。
