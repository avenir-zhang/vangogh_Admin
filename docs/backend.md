# Van Gogh Admin - Backend Documentation

## Overview

The backend of the Van Gogh Admin system is built using **NestJS**, a progressive Node.js framework. It provides a robust and scalable architecture for managing students, courses, attendance, and financial data.

## Technology Stack

*   **Framework**: [NestJS](https://nestjs.com/) (v11)
*   **Language**: TypeScript
*   **Database**: MySQL (v8.0)
*   **ORM**: [TypeORM](https://typeorm.io/) (v0.3)
*   **Authentication**: Passport, JWT
*   **API Documentation**: Swagger (OpenAPI)

## Directory Structure

```
server/
├── src/
│   ├── modules/            # Business Logic Modules
│   │   ├── attendances/    # Attendance Management
│   │   ├── auth/           # Authentication & Authorization
│   │   ├── courses/        # Course Management
│   │   ├── dashboard/      # Dashboard Statistics
│   │   ├── orders/         # Order & Finance Management
│   │   ├── students/       # Student Management
│   │   ├── subjects/       # Subject (Category) Management
│   │   ├── teachers/       # Teacher Management
│   │   └── users/          # System User Management
│   ├── app.module.ts       # Root Module
│   └── main.ts             # Application Entry Point
├── test/                   # End-to-End Tests
├── .env                    # Environment Variables
└── package.json            # Dependencies and Scripts
```

## Key Features

### 1. Module Architecture
Each business domain (e.g., Students, Courses) is encapsulated in its own module, containing:
*   **Controller**: Handles incoming HTTP requests.
*   **Service**: Contains business logic and interacts with the database.
*   **Entity**: Defines the database schema using TypeORM decorators.
*   **Module**: Bundles the controller, service, and entity together.

### 2. Authentication
*   Uses `Passport` with `JWT Strategy` for secure API access.
*   `AuthGuard` is applied to protected routes to ensure only authorized users can access them.

### 3. Database Management
*   **TypeORM** is used for object-relational mapping.
*   Entities are defined in TypeScript classes and mapped to MySQL tables.
*   Supports complex relationships (One-to-Many, Many-to-One) between entities (e.g., Student <-> StudentCourse <-> Course).

### 4. Arrears Management (New)
*   Implements a dynamic calculation model for student course balances.
*   Allows negative balances (arrears) to support "class first, pay later" scenarios.
*   Logic resides mainly in `StudentsService` (`getStudentSubjectStats`) and `CoursesService` (`findCourseStudents`).

## API Documentation (Swagger)

The API documentation is automatically generated using Swagger.

1.  Start the server:
    ```bash
    pnpm start:dev
    ```
2.  Open your browser and navigate to:
    `http://localhost:3000/api`

Here you can view all available endpoints, request schemas, and test APIs directly.

## Running the Application

### Prerequisites
*   Node.js (>= 20)
*   MySQL Database

### Installation

```bash
cd server
pnpm install
```

### Configuration
Create a `.env` file in the `server` directory based on `.env.example` (or your specific environment needs):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=vangogh_db
JWT_SECRET=your_jwt_secret
```

### Start Server

```bash
# Development mode
pnpm start:dev

# Production mode
pnpm start:prod
```
