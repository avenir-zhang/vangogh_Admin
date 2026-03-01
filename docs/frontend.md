# Van Gogh Admin - Frontend Documentation

## Overview

The frontend of the Van Gogh Admin system is built using **React** and **Ant Design Pro**, providing a comprehensive and responsive user interface for administrative tasks.

## Technology Stack

*   **Framework**: [UmiJS](https://umijs.org/) (v4)
*   **UI Library**: [Ant Design Pro](https://pro.ant.design/) (v5)
*   **Components**: [Ant Design](https://ant.design/) (v5)
*   **State Management**: Umi Model (based on Hooks)
*   **Request Library**: `useRequest` (Umi)
*   **Internationalization**: `react-intl` (en-US, zh-CN)

## Directory Structure

```
client/
├── src/
│   ├── assets/             # Static Assets
│   ├── components/         # Reusable Components
│   ├── config/             # Configuration Files (e.g., config.ts)
│   ├── locales/            # Internationalization Files
│   ├── models/             # Global State Models
│   ├── pages/              # Page Components
│   │   ├── Attendance/     # Attendance Management
│   │   ├── Calendar/       # Course Schedule
│   │   ├── Course/         # Course Management
│   │   ├── Dashboard/      # System Dashboard
│   │   ├── Finance/        # Financial Reporting
│   │   ├── Order/          # Order Management
│   │   ├── Student/        # Student Management
│   │   ├── Subject/        # Subject Management
│   │   ├── Teacher/        # Teacher Management
│   │   └── User/           # Login and User Management
│   ├── services/           # API Requests
│   └── app.tsx             # Application Entry Point
├── mock/                   # Mock Data
├── public/                 # Public Assets (e.g., icons)
└── package.json            # Dependencies and Scripts
```

## Key Features

### 1. Page Layout
*   Uses `ProLayout` for consistent layout (Sidebar, Header, Breadcrumbs).
*   `PageContainer` wraps page content for standard padding and headers.

### 2. Student Management
*   **List View**: Displays all students with filtering options.
*   **Detail View**: Shows student profile, course enrollment status, and attendance history.
*   **Arrears Indication**: Highlights students with negative course balances in red (Arrears Management).

### 3. Course Management
*   **Course Creation**: Supports flexible scheduling (e.g., specific days of the week).
*   **Course Detail**: Lists enrolled students and their remaining course hours.
*   **Arrears Check**: Students in arrears are visually marked in the course roster.

### 4. Order System
*   **Order Creation**: Supports new enrollment, renewal, and supplementary payments.
*   **Order Detail**: View breakdown of fees, course hours (regular + gift), and payment status.

### 5. Attendance Tracking
*   **Check-in/Check-out**: Allows teachers/admins to mark attendance.
*   **History**: View attendance records per student or per course.
*   **Statistics**: Automatically deducts course hours upon attendance.

## Development Guide

### Prerequisites
*   Node.js (>= 20)
*   pnpm

### Installation

```bash
cd client
pnpm install
```

### Running the Application

```bash
# Start development server
pnpm start
```

The application will be available at `http://localhost:8000`.

### Building for Production

```bash
pnpm build
```

The build output will be in the `dist` directory.

## Configuration

### Proxy Setup
The frontend development server proxies API requests to the backend server.
Check `config/proxy.ts` (or `config.ts`) to ensure it points to the correct backend URL (e.g., `http://localhost:3000`).

```typescript
// Example proxy configuration
dev: {
  '/api/': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: { '^': '' },
  },
},
```
