# 🛒 Multi-Vendor Marketplace (Mini Shopee/Tiki)

## 📚 Table of Contents

- [📌 Overview](#-overview)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [📁 Project Structure](#-project-structure)

- [⚙️ Getting Started](#️-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Run Project](#run-project)

- [📡 API Design](#-api-design)
  - [Base URL](#base-url)
  - [Response Format](#response-format)
  - [Pagination](#pagination)

- [🚀 Key Features](#-key-features)
  - [Authentication & Authorization](#-authentication--authorization)
  - [Shop Management](#-shop-management)
  - [Product & Category](#-product--category)
  - [Cart & Checkout](#-cart--checkout)
  - [Payment](#-payment)
  - [Admin Dashboard](#-admin-dashboard)

- [🔄 Background Jobs](#-background-jobs)
- [⚡ Performance & Optimization](#-performance--optimization)
- [🔒 Security](#-security)

- [🧠 Design Decisions](#-design-decisions)
  - [Redis for Cart](#1-redis-for-cart-instead-of-database)
  - [Refresh Token Rotation](#2-refresh-token-rotation)
  - [Prisma Transactions](#3-prisma-transactions-for-checkout)
  - [Cache Versioning](#4-cache-versioning-strategy)
  - [Pagination Strategy](#5-cursor-vs-offset-pagination)

- [📈 Project Status](#-project-status)
- [🔮 Future Improvements](#-future-improvements)
- [📬 Contact](#-contact)

## 📌 Overview

This project is a **scalable backend system** for a multi-vendor e-commerce platform, inspired by real-world marketplaces like Shopee or Tiki.

It allows multiple sellers to manage their own shops and products, while customers can browse, purchase, and review items within a unified platform.

The goal of this project is to simulate a **production-ready backend system**, focusing on:

- Clean and maintainable architecture
- Real-world business logic (orders, payments, seller workflows)
- Performance optimization (Redis caching, pagination)
- Asynchronous processing (queues, cron jobs)

The system supports **multiple roles (ADMIN, SELLER, USER)** with proper authentication, authorization, and data isolation.

---

## 🛠️ Tech Stack

### Backend

- Node.js
- Express.js
- TypeScript

### Database

- PostgreSQL
- Prisma ORM

### Caching & Queue

- Redis
- BullMQ

### Authentication & Validation

- JWT (Access Token + Refresh Token)
- Zod (schema validation)

### Services

- Nodemailer (email service)
- Cloudinary

---

## 🏗️ Architecture

This project follows a **Modular Layered Architecture** with a **feature-based structure**.

Instead of a traditional MVC approach, each domain (Auth, Product, Order, etc.) is organized into its own module. This improves scalability, maintainability.

### Key Architectural Layers

#### 1. Module Layer (Business Logic)

- Organized by feature (auth, product, order, etc.)
- Each module contains:
  - Controller (handle request/response)
  - Service (business logic)
  - Route (API endpoints)
  - Validation (checks input data format & rules)
  - Type (defines data structure & type safety)

#### 2. Core Layer (Infrastructure)

- Database connection (Prisma)
- Redis (caching & session data)
- Queue system (BullMQ)
- Mail service (Nodemailer)

#### 3. Jobs Layer (Background Processing)

- Handles asynchronous tasks:
  - Sending emails
  - Daily reports
  - Order cleanup
- Includes queue processors and cron schedulers

#### 4. Shared Layer (Reusable Components)

- Utilities (pagination, response, etc.)
- Middlewares (auth, error handling, validation, etc.)
- Constants & types
- Validation schemas (Zod)

#### 5. View Layer (EJS Templates)

- Used for email templates and server-side rendering (if needed)
- Organized into reusable partials

---

### Key Concepts

- Separation of concerns (Controller → Service)
- Stateless APIs + Redis for stateful data (cart, tokens)
- Event-driven architecture using BullMQ
- ACID transactions using Prisma

## 📁 Project Structure

```text
src/
├── 📂 modules/                # Feature-based modules (Business logic)
│   ├── 📁 auth/               # Authentication & authorization (JWT, OAuth)
│   ├── 📁 user/               # User profiles, addresses, and settings
│   ├── 📁 shop/               # Seller shop management & onboarding
│   ├── 📁 product/            # Product catalog & category management
│   ├── 📁 order/              # Order processing & checkout workflow
│   ├── 📁 cart/               # High-performance Cart (Redis-based)
│   ├── 📁 review/             # Product ratings and reviews
│   └── 📁 admin/              # Admin-only controls & system dashboard
│
├── 📂 jobs/                   # Background tasks (BullMQ)
│   ├── 📁 processors/         # Logic for processing specific jobs
│   ├── 📁 queues/             # Queue definitions (Email, Notifications)
│   └── 📁 schedulers/         # Cron jobs (Daily reports, system cleanup)
│
├── 📂 core/                   # Core system infrastructure
│   ├── 📁 database/           # Prisma client & Database configurations
│   ├── 📁 cache/              # Redis setup & caching helpers
│   ├── 📁 queue/              # BullMQ connection & global config
│   └── 📁 mail/               # Mail service (Nodemailer)
│
├── 📂 shared/                 # Shared utilities & common logic
│   ├── 📁 utils/              # Helper functions (Pagination, API Responses)
│   ├── 📁 constants/          # Application-wide constants & Enums
│   ├── 📁 middlewares/        # Express middlewares (Auth, Error Handling)
│   ├── 📁 validators/         # Input validation using Zod schemas
│   └── 📁 types/              # Global TypeScript interfaces & types
│
└── 📂 view/                   # Server-side templates (EJS)
    ├── 📁 emails/             # HTML Email templates
    └── 📁 partials/           # Reusable EJS components
```

## ⚙️ Getting Started

Follow the steps below to set up and run the project locally.

---

### 📦 Prerequisites

Make sure you have the following installed:

- Node.js (>= 18)
- PostgreSQL
- Redis
- Docker (optional, for running Redis easily)

---

### 📥 Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/GiaVoHCMUS/Multi-vendor-Marketplace.git
cd Multi-vendor-Marketplace
cd backend
npm install
```

---

### Environment Variables

Create a `.env` file in the root directory:

```env
# App
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
APP_NAME="T Shop"

# Database
# If running locally → use localhost
# If using Docker → replace 'localhost' with service name (e.g. marketplace_postgres)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketplace_dev?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary (Image Upload)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=14d

# Mail (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_PORT=587
SMTP_SECURE=tls
SMTP_FROM=your_email@gmail.com
SMTP_FROM_NAME="T Shop"
```

### Run project

#### 1. Start Redis

If Redis is not installed locally, run it using Docker:

```bash
docker run -d -p 6379:6379 redis
```

#### 2. Setup Database

Run Prisma migrations and generate client:

```bash
npx prisma migrate dev
npx prisma generate
```

#### 3. Start Development Server

```bash
npm run dev
```

#### 4. Access Application

Server will be running at:

```
http://localhost:3000
```

## 📡 API Design

### Base URL

All API endpoints are prefixed with: `/api`

---

### Response Format

All responses follow a standardized structure to ensure consistency across the system.

#### ✅ Success Response

```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "meta": {}
}
```

#### ❌ Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": {}
}
```

---

### Pagination

The system supports **two pagination strategies** depending on the use case.

---

#### 🔄 Cursor-based Pagination

Used for infinite scrolling and handling large datasets efficiently.

```json
{
  "success": true,
  "data": [],
  "nextCursor": "eyJpZCI6ICIxMjMifQ==",
  "hasMore": true
}
```

Characteristics:

- Optimized for large datasets.
- Prevents duplicate or missing records when data changes.
- Suitable for infinite scroll (e.g. product listing).
- Does not support jumping to arbitrary pages.

#### 📄 Offset-based Pagination

Used for dashboards and reporting where page navigation is required.

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "totalItems": 100,
    "totalPages": 10,
    "currentPage": 1,
    "limit": 10
  }
}
```

Characteristics:

- Simple and intuitive (page-based navigation)
- Supports jumping to specific pages (page 1, 2, 3, ...)
- Suitable for admin dashboards and analytics
- Less efficient for very large datasets compared to cursor-based pagination

## 🚀 Key Features

### 🔐 Authentication & Authorization

- JWT-based authentication (Access Token + Refresh Token)
- Refresh Token Rotation (stored in Redis)
- Role-based access control (`ADMIN`, `SELLER`, `USER`)
- Email verification
- Forgot password & reset password

---

### 🏪 Shop Management

- Users can request to become sellers
- Admin approval workflow
- Seller profile management
- Seller dashboard (orders, revenue, balance)

---

### 📦 Product & Category

- CRUD product (Seller)
- Category management (Admin)
- Product filtering:
  - Category
  - Price range
  - Shop
  - Search by name
- Image upload (Cloudinary / S3)

---

### 🛒 Cart & Checkout

- Cart stored in Redis (high performance)
- Add / update / remove items
- Checkout flow with Prisma transaction to ensure consistency
- Automatic rollback if any step fails

---

### 💳 Payment

- Mock payment system (for testing transaction flow)
- Supports:
  - MoMo (in progress)
  - Cash on Delivery (COD)
  - Extensible for VNPay / ZaloPay

---

### 📊 Admin Dashboard

- Platform statistics:
  - Total revenue
  - Total orders
  - New users / shops
  <!-- - Daily aggregation using cron jobs -->
- Optimized queries using `SystemStat` table

## 🔄 Background Jobs

The system uses **BullMQ** to handle asynchronous tasks and scheduled jobs, ensuring that heavy or time-consuming operations do not block the main API flow.

---

### 🧩 Why Background Jobs?

- Improve API response time
- Handle heavy tasks asynchronously
- Ensure system scalability
- Support retry & failure handling

---

### ⚙️ Job Types

#### 📧 Email Jobs

Handled via queue to avoid blocking API requests.

- Send email verification
- Send password reset email
- Send order confirmation
- Notify seller when a new order is placed

---

#### 📊 Daily Report Jobs (Cron)

Executed automatically on a schedule (e.g. every day at 23:59).

- Calculate daily revenue
- Count total orders
<!-- - Count new users / shops
- Store aggregated data in `SystemStat` table -->

**Benefits:**

- Fast admin dashboard queries
- Avoid heavy real-time calculations

---

#### 🧹 Cleanup Jobs

Automated system maintenance tasks:

- Cancel pending orders after 24 hours
- Update order status if necessary
- Prevent stale or invalid data

---

### 🔁 Retry & Failure Handling

- Jobs are configured with retry attempts
- Exponential backoff strategy
- Failed jobs are logged for debugging

## ⚡ Performance & Optimization

The system is designed with performance and scalability in mind, using caching strategies, efficient pagination, and optimized database queries.

---

### 🚀 Redis Caching

Redis is used to reduce database load and improve response time for frequently accessed data.

#### Cached Data

- Product list (with versioning)
- Product detail
- Category list
- User addresses

#### Cache Strategy

- **Cache-aside pattern** (read-through)
- Data is fetched from Redis first, fallback to database if not found
- Cache is updated after database query

---

### 🧠 Cache Versioning

- Cache versioning for efficient invalidation

---

### 🗄️ Database Optimization

- Proper indexing on frequently queried fields:
  - `categoryId`, `price`, `status`
  - `userId`, `createdAt`
- Avoid unnecessary joins
- Use selective queries instead of fetching all fields


## 🔒 Security

The system is designed with multiple layers of security to protect user data, prevent common attacks, and ensure safe API usage.

---

### 🔐 Authentication

- JWT-based authentication (Access Token + Refresh Token)
- Short-lived access tokens to reduce risk
- Refresh tokens stored securely in Redis
- Token expiration handled automatically

---

### 🔁 Refresh Token Rotation

- A new refresh token is issued on each refresh request
- Old refresh tokens are invalidated
- Tokens stored in Redis with TTL

**Benefits:**

- Prevents token reuse attacks
- Improves session security
- Enables secure logout

---

### 🛡️ Authorization

- Role-based access control (RBAC):
  - `ADMIN`
  - `SELLER`
  - `USER`
- Route-level protection using middleware
- Ensures users can only access permitted resources

---

<!-- ### 🚫 Rate Limiting

- Implemented using Redis
- Limits number of requests per IP/user
- Protects against:
  - Brute-force attacks
  - API abuse
  - DDoS (basic level)

---

### 🧱 Secure Headers

- Uses **Helmet** to set HTTP security headers
- Protects against:
  - XSS (Cross-site scripting)
  - Clickjacking
  - MIME sniffing

---

### 🌐 CORS Configuration

- Configured to allow only trusted origins
- Prevents unauthorized cross-origin requests

--- -->

### ✅ Input Validation

- Uses **Zod** for request validation
- Validates:
  - Request body
  - Query parameters
  - Route params

**Benefits:**

- Prevents malformed data
- Reduces risk of injection attacks

---

### ⚠️ Error Handling

- Centralized error handling middleware
- Prevents leaking sensitive information
- Standardized error response format

---

### 🔑 Sensitive Data Protection

- Environment variables used for secrets
- No hardcoded credentials in source code
- `.env` file should not be committed

---

### 📌 Summary

These security practices ensure the system is:

- Protected against common web vulnerabilities
- Secure in authentication and authorization
- Resilient against abuse and attacks


## 🧠 Design Decisions

This section explains the key technical decisions made in the system, along with the reasoning and trade-offs behind them.

---

### 1. Redis for Cart Instead of Database

Instead of storing cart data in the database, the system uses **Redis** for better performance and scalability.

#### Why?

- Faster read/write operations (in-memory)
- Reduces load on the primary database
- Suitable for temporary/session-based data like cart

#### How it works

- Each user's cart is stored in Redis (by `userId` or `sessionId`)
- All cart operations (add/update/remove) are handled directly in Redis
- Cart is cleared after successful checkout

#### Trade-offs

- Data is not persistent (acceptable for cart use case)
- Requires handling expiration and consistency carefully

---

### 2. Refresh Token Rotation

The system implements **Refresh Token Rotation** to enhance authentication security.

#### Why?

- Prevents reuse of stolen refresh tokens
- Improves overall session security

#### How it works

- A new refresh token is issued every time a new access token is generated
- The old refresh token is invalidated
- Refresh tokens are stored in Redis with TTL

#### Trade-offs

- Slightly more complex implementation
- Requires additional storage (Redis)

---

### 3. Prisma Transactions for Checkout

The checkout process uses **Prisma Transactions** to ensure data consistency.

#### Why?

- Prevents inconsistent states (e.g. order created but stock not updated)
- Avoids overselling products

#### How it works

All steps are executed within a single transaction:

1. Validate product stock  
2. Create Order & OrderItems  
3. Deduct product stock  
4. Create transaction log  
5. Clear cart  

If any step fails → **rollback entire transaction**

#### Trade-offs

- Slight performance overhead
- Requires careful error handling

---

### 4. Cache Versioning Strategy

Instead of manually deleting cache keys, the system uses a **versioning strategy** to invalidate cache.

#### Why?

- Avoids complex cache invalidation logic
- Scales better with large datasets

#### How it works

Each cache key includes a version:
```
marketplace:products:v1:list:page_1_limit_10
```
When data changes:
```
marketplace:products:v2:list:page_1_limit_10
```


- Version is stored in Redis
- Increment version when data changes
- New requests use the updated version
- Old cache becomes unused automatically

#### Trade-offs

- Old cache remains in memory until expired
- Requires managing version keys properly

---

### 5. Cursor vs Offset Pagination

The system uses both pagination strategies depending on the use case.

#### Why?

Different scenarios require different approaches:

- User-facing APIs → performance & consistency
- Admin dashboards → usability & navigation

#### How it works

**Cursor-based Pagination (User Side):**

- Uses a cursor (e.g. last item ID) to fetch next data
- Optimized for infinite scroll
- Prevents duplicate/missing records

**Offset-based Pagination (Admin Side):**

- Uses `page` and `limit`
- Supports jumping between pages
- Suitable for reporting and dashboards

#### Trade-offs

- Cursor-based:
  - More efficient but harder to implement
  - Cannot jump to arbitrary pages  

- Offset-based:
  - Easy to use but less efficient on large datasets  


## 📈 Project Status

### ✅ Completed

- Authentication & Authorization (JWT + Refresh Token Rotation)
- User profile & address management
- Product & category CRUD
- Shop management (seller flow)
- Cart system (Redis-based)
- Checkout flow with Prisma Transactions
- Email service (verification, forgot password)
- Seller dashboard improvements
- Background jobs (BullMQ):
  - Email queue
  - Daily reports
  - Auto cancel unpaid orders

---

### 🚧 In Progress

- Payment integration (MoMo, COD)
- Checkout flow refinement


---

### 🔜 Planned

- Rate limiting (Redis-based)
- CORS configuration (whitelist domains)
- Advanced logging & monitoring
- API documentation (Swagger / Postman)

---

## 🔮 Future Improvements

- Full-text search (Elasticsearch)
- Docker Compose / Kubernetes deployment
- CDN & image optimization
- Real-time notifications (WebSocket / Socket.IO)
- Advanced caching strategies (multi-layer cache)
- Security enhancements:
  - Rate limiting
  - CORS restriction
  - IP-based protection
  - Audit logging

---

## 📬 Contact

If you have any questions, feedback, or would like to collaborate:

- Email: quocgia2005@gmail.com
- GitHub: https://github.com/GiaVoHCMUS

---

> ⭐ If you find this project helpful, feel free to give it a star!