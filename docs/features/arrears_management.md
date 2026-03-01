# 欠费管理系统功能设计文档 (Arrears Management System)

## 1. 概述 (Overview)

为了适应艺术教育机构“先上课后付费”或“课时透支”的业务场景，本系统实现了欠费管理模块。该模块允许学员的剩余课时为负数，并自动在前端界面标记欠费状态，提醒教务人员及时跟进续费。

## 2. 核心逻辑 (Core Logic)

### 2.1 课时计算模型 (Calculation Model)

系统不再依赖数据库中静态存储的 `remaining_courses` 字段，而是采用**动态计算**模型，确保数据的一致性。

*   **总购课时 (Total Purchased)**: 
    *   统计该学员在该科目下所有 **状态为正常 (Active)** 且 **未过期** 的订单中的正价课时与赠送课时之和。
    *   `Total Purchased = SUM(Active Orders.regular_courses) + SUM(Active Orders.gift_courses)`

*   **总消耗课时 (Total Consumed)**:
    *   统计该学员在该科目下所有 **签到记录 (Attendances)** 的 `hours_deducted` 之和。
    *   `Total Consumed = SUM(Attendances.hours_deducted)`

*   **剩余课时 (Remaining Balance)**:
    *   `Remaining Balance = Total Purchased - Total Consumed`
    *   如果 `Remaining Balance < 0`，则判定为**欠费 (In Arrears)**。

### 2.2 数据精度 (Precision)

*   **小数支持**: 所有课时字段（正价、赠送、消耗、剩余）均支持小数（如 1.5 课时）。
*   **显示精度**: 前端统一保留 **2位小数**（如 `1.50`），后端数据库采用 `decimal(10, 2)` 或类似精度存储。

## 3. 功能实现 (Implementation)

### 3.1 后端接口 (Backend API)

#### `GET /api/students/:id/subject-stats`
*   **功能**: 获取学员各科目的详细统计数据。
*   **逻辑**:
    1.  查询所有关联的有效订单（Active Orders）。
    2.  查询所有关联的签到记录（Attendances）。
    3.  按 `Subject` (科目) 进行聚合计算。
    4.  返回每个科目的 `totalRegular`, `totalGift`, `consumed`, `remaining`。

#### `GET /api/courses/:id/students`
*   **功能**: 获取某课程下的学员列表及课时状态。
*   **逻辑**:
    1.  查询课程花名册。
    2.  动态计算每位学员在该科目下的总剩余课时（跨课程统计）。
    3.  返回包含 `remaining_courses` 的学员列表。

### 3.2 前端展示 (Frontend UI)

#### 学员详情页 (Student Detail)
*   **位置**: `src/pages/Student/Detail/index.tsx`
*   **展示**:
    *   **欠费标签**: 在科目名称旁显示红色的 `<Tag color="error">欠费</Tag>`。
    *   **高亮边框**: 欠费科目的卡片边框变为红色 (`border: 1px solid #ff4d4f`)。
    *   **数值颜色**: 剩余课时数值小于0时显示为红色。

#### 课程详情页 (Course Detail)
*   **位置**: `src/pages/Course/Detail/index.tsx`
*   **展示**:
    *   **学员列表**: 在学员列表的“剩余课时”列，若数值小于0，显示红色并附加“临时学员/欠费”标记。

## 4. 数据库变更 (Database Changes)

*   **Attendance Entity**:
    *   移除了 `Unique(['student_id', 'course_id', 'attendance_date'])` 约束，以避免数据冲突并支持更灵活的签到记录。
    *   修复了外键索引命名冲突问题。

## 5. 后续优化 (Future Improvements)

*   **欠费提醒**: 增加自动发送短信/微信通知功能。
*   **欠费限制**: 可配置是否允许欠费签到（目前默认允许）。
