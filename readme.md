# 🛒 Multi-Vendor Marketplace (Mini Shopee/Tiki)

[![Backend CI](https://github.com/GiaVoHCMUS/Multi-vendor-Marketplace/actions/workflows/ci.yml/badge.svg)](https://github.com/GiaVoHCMUS/Multi-vendor-Marketplace/actions/workflows/ci.yml)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?&style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)

A high-performance, robust, and scalable backend system for a Multi-vendor E-commerce platform. Engineered with a strong emphasis on **Clean Code**, **Modular-layered Architecture**, and **System Performance**.

## 📚 Table of Contents
- [🧠 System Architecture & Design Decisions](#-system-architecture--design-decisions)
- [⚡ Background Jobs & Performance](#-background-jobs--performance)
- [🚀 Key Features](#-key-features)
- [🛠 Tech Stack](#-tech-stack)
- [📂 Core Project Structure](#-core-project-structure)
- [⚙️ Getting Started](#getting-started)

---

## 🧠 System Architecture & Design Decisions

This project moves beyond standard CRUD operations, implementing real-world architectural patterns to ensure scalability and maintainability:

* **Modular-Layered Architecture:** Features are strictly divided into independent domains (`Shop`, `Order`, `Product`, `Auth`, ...). Decoupled using **Dependency Injection**, ensuring strict Separation of Concerns.
* **Redis-Powered Cart System:** Migrated cart state from the primary database to Redis. This drastically improves read/write speeds for frequent cart operations and reduces database load.
* **ACID Checkout with Prisma Transactions:** The checkout flow utilizes robust DB transactions to prevent race conditions. It handles stock deduction, order splitting by vendor, and payment state in a single atomic operation (All-or-Nothing).
* **Advanced Cache Versioning:** Implemented a versioning strategy for cache keys (e.g., `marketplace:products:v2:list`) to handle graceful cache invalidation without complex deletion logic.
* **Dual Pagination Strategy:** 
  * *Cursor-based Pagination* for user-facing APIs (optimized for infinite scrolling and large datasets).
  * *Offset-based Pagination* for Admin/Seller dashboards (optimized for random access and reporting).
* **Refresh Token Rotation:** Enhances security by issuing a new refresh token family on every access token generation, preventing token reuse attacks.

---

## ⚡ Background Jobs & Performance

To ensure ultra-fast API response times, heavy and scheduled tasks are offloaded to **BullMQ** (Redis-based message queue):

* **📧 Email Queue:** Handles email verification, password resets, and order confirmations asynchronously.
* **📊 Cron Schedulers:** Generates daily revenue reports and platform statistics during off-peak hours, allowing the Admin Dashboard to fetch pre-calculated data instantly.
* **🧹 Cleanup Workers:** Automatically cancels unpaid pending orders after 24 hours to release locked inventory.

---

## 🚀 Key Features

* **Role-Based Access Control (RBAC):** Distinct workflows and strict data isolation for `ADMIN`, `SELLER`, and `USER`.
* **Vendor Onboarding & Dashboard:** Sellers can manage inventory, track split-orders, and monitor revenue. Requires Admin approval workflow.
* **Standardized API Envelope:** All endpoints strictly follow a predictable `success/data/meta/message` JSON structure.
* **Unit & Load Tested:** Core business logic is covered by **Jest**, with performance bottlenecks tested via **k6**.
![Test Coverage](./backend/assets/coverage-report.png)

---

## 🛠 Tech Stack

* **Core:** Node.js, Express.js, TypeScript
* **Database:** PostgreSQL (Prisma ORM)
* **Caching & Queues:** Redis, BullMQ
* **Validation & Security:** Zod, JWT, Helmet, Rate Limiting
* **Testing:** Jest, k6
* **Infrastructure:** Docker, Docker Compose

---

## 📂 Core Project Structure
The codebase is organized using a **Modular Domain-Driven Design (DDD)** approach. Each feature is self-contained within the `src/modules` directory, keeping business logic isolated and highly maintainable.

```text
├── prisma/                    # Database schema and migration history
├── tests/                     # Automated testing suite
│   ├── load/                  # k6 load testing scripts & test data
│   └── modules/               # Jest unit tests isolated by domain modules
├── src/
│   ├── core/                  # Global Infrastructure (Prisma, Redis, BullMQ, Configs)
│   ├── docs/                  # OpenAPI / Swagger configuration and YAML files
│   ├── jobs/                  # Asynchronous Background Jobs (BullMQ)
│   │   ├── cron/              # Cron schedulers
│   │   ├── mail/              # Email queue processors
│   │   ├── order/             # Order state cleanup workers
│   │   └── report/            # Analytics generation workers
│   ├── modules/               # Bounded Contexts (Business Logic)
│   │   ├── admin/             # System orchestration & dashboard
│   │   ├── auth/              # IAM, JWT, & Session management
│   │   ├── cart/              # Redis-backed high-performance cart
│   │   ├── category/          # Taxonomy management
│   │   ├── order/             # Checkout workflows & DB transactions
│   │   ├── payment/           # Payment gateways (VNPay, etc.)
│   │   ├── products/          # Catalog & inventory management
│   │   ├── shop/              # Vendor profiles & onboarding
│   │   └── user/              # User accounts & addresses
│   ├── routes/                # Centralized API router configuration (index.ts)
│   ├── scripts/               # Database seeders and utility scripts
│   ├── shared/                # Cross-cutting concerns & reusable components
│   │   ├── constants/         # App-wide constants & error messages
│   │   ├── middleware/        # Auth, Validation, Upload, Error handling
│   │   ├── query/             # PrismaQueryHelper for dynamic filtering/pagination
│   │   ├── repositories/      # Generic BaseRepository pattern implementation
│   │   ├── schemas/           # Global Zod validation schemas
│   │   ├── services/          # Shared external services (Cache, Image, Mail)
│   │   └── utils/             # Helpers, custom AppError, response formatters
│   ├── views/                 # Server-side templates (Emails for Auth/Order/Shop)
│   ├── app.ts                 # Express application initialization & middleware setup
│   └── server.ts              # Application entry point & server bootstrapping
├── package.json               # Project dependencies and scripts
├── jest.config.cjs            # Testing framework configuration
└── tsconfig.json              # TypeScript compiler configuration
```
---

<a id="getting-started"></a>
## ⚙️ Getting Started

### Prerequisites
* Node.js (v18+)
* Docker & Docker Compose (for PostgreSQL and Redis)

1. **Clone & Install:**
    ```bash
    git clone https://github.com/GiaVoHCMUS/Multi-vendor-Marketplace.git
    cd Multi-vendor-Marketplace/backend
    npm install
2. **Environment Setup:**
    ```env
   # App
   PORT=3000
   NODE_ENV=development
   APP_URL=http://localhost:3000
   APP_NAME="T Shop"
   CLIENT_URL=http://localhost:5173/

   # Database (Local Postgres)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketplace_dev?schema=public

   # Database (Supabase Connection Pooling - uncomment if used)
   # DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@[aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true](https://aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true)"
   # DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@[aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres](https://aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres)"

   # Redis Config (Local)
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Redis (Upstash - uncomment if used)
   # REDIS_URL="rediss://default:[YOUR_UPSTASH_TOKEN]@champion-tadpole-69237.upstash.io:6379"

   # Cloudinary
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # JWT 
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
   ACCESS_TOKEN_EXPIRES=10m
   REFRESH_TOKEN_EXPIRES=14d

   # Mail (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD="your_app_password"
   SMTP_PORT=587
   SMTP_SECURE=tls
   SMTP_FROM=your_email@gmail.com
   SMTP_FROM_NAME="T Shop"

   # VN Pay
   VNP_TMN_CODE=your_vnp_tmn_code
   VNP_HASH_SECRET=your_vnp_hash_secret
   VNP_URL=[https://sandbox.vnpayment.vn/paymentv2/vpcpay.html](https://sandbox.vnpayment.vn/paymentv2/vpcpay.html)
   VNP_RETURN_URL=http://localhost:3000/api/payment/vnpay-return
3. **Spin up Infrastructure & Database:**
    ```bash
    docker-compose up -d
    npx prisma migrate dev
    npm run seed
4. **Run the Application:**
    ```bash
    npm run dev