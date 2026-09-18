# 🛠️ Sahaayak — Transparent Fair Gig Marketplace & Doorstep Services

> **India's First Dignified Gig Economy Platform**  
> Zero commission on small jobs (≤ ₹599), multi-factor transparent assignment engine, verified partner KYC, real-time live tracking, and pay-after-service guarantee.

---

## 📖 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [System Architecture](#-system-architecture)
4. [Folder Structure](#-folder-structure)
5. [Prerequisites](#-prerequisites)
6. [Step-by-Step Setup Guide](#-step-by-step-setup-guide)
7. [Environment Variables](#-environment-variables)
8. [Database Configuration (PostgreSQL)](#-database-configuration-postgresql)
9. [Pre-Seeded Demo Accounts](#-pre-seeded-demo-accounts)
10. [Core Features & Portals](#-core-features--portals)
11. [Troubleshooting](#-troubleshooting)

---

## 🌟 Project Overview

Traditional gig platforms deduct **25% to 35% commission** from every service booking, lock workers into opaque black-box dispatch algorithms, and force customers into non-refundable upfront charges.

**Sahaayak** reimagines doorstep services as an equitable, transparent, and high-trust marketplace:

- **₹0 Platform Commission on Everyday Jobs:** 100% of customer payment goes directly to workers for services priced up to **₹599**. For larger jobs (> ₹599), only a modest 10% fee applies to labour (0% on parts, materials, and tips).
- **Multi-Factor Automated Assignment Engine:** Replaces black-box favoritism with transparent weighted criteria (proximity, workload balance, rating, fairness rotation, and reliability).
- **Pay-After-Service Guarantee:** Customers only pay after the verified service partner arrives, performs the work, and the customer confirms full satisfaction.
- **Bi-directional Live Synchronization:** Real-time job dispatches, in-app messaging, live status transitions, and notification broadcasts via WebSockets (Socket.io).
- **Comprehensive 3-Way Portal:** Dedicated, tailored interfaces for **Customers**, **Gig Workers**, and **Platform Administrators**.

---

## 💻 Tech Stack

### Frontend (`/client`)
- **Framework:** React 19 + Vite 6
- **Styling:** Tailwind CSS v4 + Custom Glassmorphism & Micro-animations
- **Routing:** React Router v7
- **Real-Time Client:** Socket.io Client (`socket.io-client`)
- **HTTP Client:** Axios with dynamic JWT interceptors
- **Icons:** Lucide React
- **Theming:** Persistent Dark / Light Mode

### Backend (`/server`)
- **Runtime & Framework:** Node.js (v18+) + Express.js 4
- **Database Engine:** PostgreSQL (Neon Cloud / AWS RDS / Self-hosted) via `pg` connection pool
- **Real-Time Engine:** Socket.io Server (rooms for users and individual bookings)
- **Security & Auth:** JSON Web Tokens (`jsonwebtoken`), Bcrypt password hashing (`bcryptjs`), rate limiting (`express-rate-limit`)
- **File Uploads:** Multer (KYC proofs, before/after job photos)
- **Document Generation:** PDFKit (dynamic GST-ready PDF invoices)

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["Vite + React 19 Frontend<br/>(Port 5173)"]
    API["Express.js REST API<br/>(Port 5000)"]
    Socket["Socket.io Server<br/>(WebSocket Rooms)"]
    DB[("PostgreSQL Database<br/>(Neon Serverless Cloud)")]

    Client -->|REST Requests & Auth| API
    Client <-->|Real-time Events & Alerts| Socket
    API -->|Connection Pool| DB
    Socket -->|State Updates| API
```

---

## 📁 Folder Structure

```
SIH-PS-26089-IDE/
│
├── client/                          # Frontend Application (React 19 + Vite)
│   ├── public/                      # Static assets, brand logo, favicon
│   │   └── logo.png
│   ├── src/
│   │   ├── assets/                  # Images, illustrations, service banners
│   │   ├── components/
│   │   │   └── common/              # Shared UI components
│   │   │       ├── DemoSwitcher.jsx # 1-click persona switcher for reviewers
│   │   │       ├── Navbar.jsx       # Public & customer header navigation
│   │   │       ├── NotificationDropdown.jsx # Real-time notification center
│   │   │       └── ProtectedRoute.jsx # Role-based route guard
│   │   ├── contexts/                # React Global State Providers
│   │   │   ├── AuthContext.jsx      # Authentication, user session & JWT handling
│   │   │   ├── SocketContext.jsx    # Socket.io connection & room subscribers
│   │   │   ├── ThemeContext.jsx     # Dark/Light mode theme state
│   │   │   └── ToastContext.jsx     # Global animated alert banners
│   │   ├── layouts/                 # Master Shell Layouts
│   │   │   ├── AdminLayout.jsx      # Admin command center sidebar + top navbar
│   │   │   ├── CustomerLayout.jsx   # Customer dashboard layout
│   │   │   ├── PublicLayout.jsx     # Public landing & static pages layout
│   │   │   └── WorkerLayout.jsx     # Partner portal with radar & status toggle
│   │   ├── pages/
│   │   │   ├── admin/               # Super Admin Command Center Pages
│   │   │   │   ├── AdminAssignmentSettings.jsx # Algorithmic weight tuning
│   │   │   │   ├── AdminAuditLogs.jsx          # Security & transaction event logs
│   │   │   │   ├── AdminBookings.jsx           # Global booking ledger
│   │   │   │   ├── AdminCommissionSettings.jsx # Fair commission threshold controls
│   │   │   │   ├── AdminComplaints.jsx         # Dispute arbitration
│   │   │   │   ├── AdminCustomers.jsx          # Customer registry & status
│   │   │   │   ├── AdminDashboard.jsx          # Executive KPI overview & charts
│   │   │   │   ├── AdminReports.jsx            # CSV data report export
│   │   │   │   ├── AdminReviews.jsx            # Star rating & review moderation
│   │   │   │   ├── AdminServices.jsx           # Trade catalog & pricing management
│   │   │   │   ├── AdminWorkers.jsx            # Partner directory
│   │   │   │   └── AdminWorkerVerification.jsx # 4-step KYC queue approval
│   │   │   ├── customer/            # Customer Portal Pages
│   │   │   │   ├── BookingDetail.jsx    # Live job tracking, chat & OTP completion
│   │   │   │   ├── BookService.jsx      # Dynamic multi-step service booking wizard
│   │   │   │   ├── CustomerBookings.jsx # Active & past booking history
│   │   │   │   ├── CustomerDashboard.jsx# Customer home, quick rebook & alerts
│   │   │   │   ├── CustomerProfile.jsx  # Addresses & contact settings
│   │   │   │   └── ServiceCatalog.jsx   # Filterable service trade list
│   │   │   ├── public/              # Landing & Public Pages
│   │   │   │   ├── About.jsx            # Mission & core values
│   │   │   │   ├── BecomeWorker.jsx     # Partner onboarding landing page
│   │   │   │   ├── Contact.jsx          # Help & support channel
│   │   │   │   ├── CustomerSignup.jsx   # Customer registration
│   │   │   │   ├── FAQ.jsx              # Platform FAQs
│   │   │   │   ├── Home.jsx             # Hero landing page with live catalog
│   │   │   │   ├── HowItWorks.jsx       # 4-step workflow explainer
│   │   │   │   ├── Login.jsx            # Unified login with 2FA & 1-click demos
│   │   │   │   ├── Services.jsx         # Public service browse view
│   │   │   │   └── WorkerSignup.jsx     # Partner registration with trade skills
│   │   │   └── worker/              # Worker Partner Portal Pages
│   │   │       ├── WorkerDashboard.jsx  # Incoming dispatch radar & daily earnings
│   │   │       ├── WorkerEarnings.jsx   # Payout breakdown & tip ledger
│   │   │       ├── WorkerJobDetail.jsx  # Photo proof submission & OTP validation
│   │   │       ├── WorkerJobs.jsx       # Active, accepted & completed jobs
│   │   │       └── WorkerProfile.jsx    # Trade skills, bank details & KYC status
│   │   ├── services/
│   │   │   └── api.js               # Axios instance with auth bearer interceptors
│   │   ├── App.jsx                  # Route definitions & layout wrappers
│   │   ├── index.css                # Tailwind CSS v4 configuration
│   │   └── main.jsx                 # React root DOM entrypoint
│   ├── package.json                 # Frontend dependencies & Vite scripts
│   └── vite.config.js               # Vite bundler configuration with dev proxy
│
├── server/                          # Backend Application (Node.js + Express)
│   ├── config/                      # Server configuration loader
│   │   └── index.js
│   ├── controllers/                 # Route handler logic
│   ├── database/                    # Database models & migration scripts
│   │   ├── db.js                    # Strict PostgreSQL connection pool & helpers
│   │   ├── init.js                  # Automated schema application & data seeder
│   │   └── schema.sql               # Relational PostgreSQL DDL definitions
│   ├── middleware/                  # Express middlewares
│   │   ├── auth.js                  # JWT validation & role authorization guards
│   │   └── upload.js                # Multer multipart file upload handler
│   ├── routes/                      # REST API Endpoints
│   │   ├── admin.routes.js          # Operations, audit & platform settings
│   │   ├── auth.routes.js           # Login, register, 2FA challenge, demo switcher
│   │   ├── booking.routes.js        # Booking lifecycle, OTP verification, dispute
│   │   ├── complaint.routes.js      # Grievance ticketing
│   │   ├── customer.routes.js       # Customer profile & addresses
│   │   ├── message.routes.js        # In-booking customer-worker direct chat
│   │   ├── notification.routes.js   # Notification feed & read status
│   │   ├── payment.routes.js        # Pay-after-service invoice generation
│   │   ├── report.routes.js         # CSV reporting data exports
│   │   ├── review.routes.js         # Customer ratings & reviews
│   │   ├── service.routes.js        # Service catalog & pricing models
│   │   └── worker.routes.js         # Partner status, GPS location, jobs & earnings
│   ├── services/                    # Core Business Engines
│   │   ├── assignmentEngine.js      # Proximity + Workload + Fairness matching
│   │   ├── auditService.js          # Security audit trail logging
│   │   ├── commissionService.js     # Zero-commission calculator logic
│   │   ├── invoiceService.js        # PDF invoice generation via PDFKit
│   │   ├── notificationService.js   # Socket.io notification dispatching
│   │   └── paymentService.js        # Payment confirmation & worker settlement
│   ├── uploads/                     # Storage for before/after photos & invoices
│   ├── .env                         # Server environment variables (git-ignored)
│   ├── .env.example                 # Example template for environment setup
│   ├── package.json                 # Server dependencies & scripts
│   └── server.js                    # Express & Socket.io server entrypoint
│
├── run-all.js                       # Unified runner for simultaneous client & server
├── package.json                     # Root orchestrator scripts
└── README.md                        # Project documentation
```

---

## ⚡ Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: Version `18.0.0` or higher (Node 20+ recommended)
- **npm**: Version `9.0.0` or higher
- **PostgreSQL Database**: A hosted PostgreSQL instance (e.g., [Neon.tech](https://neon.tech), Supabase, Render, or local PostgreSQL 14+).

---

## 🚀 Step-by-Step Setup Guide

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/sahaayak-platform.git
cd sahaayak-platform
```

### 2. Install Dependencies

Install all dependencies across the root, backend, and frontend:

```bash
# 1. Install root dependencies
npm install

# 2. Install backend dependencies
cd server
npm install

# 3. Install frontend dependencies
cd ../client
npm install

# Return to root directory
cd ..
```

---

### 3. Configure Backend Environment Variables

In the `server/` directory, create a `.env` file from the provided example:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and supply your PostgreSQL connection string:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=sahaayak_super_secure_jwt_key_2026_dev
JWT_EXPIRES_IN=7d
DEMO_MODE=true

# PostgreSQL Connection String (e.g. Neon Cloud)
DATABASE_URL=postgresql://username:password@your-neon-host.aws.neon.tech/database_name?sslmode=require

# Optional integrations
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GOOGLE_MAPS_API_KEY=
```

---

### 4. Initialize and Seed the Database

Run the automated seeder to apply the PostgreSQL schema (`schema.sql`) and seed all 9 standard service categories, pricing models, initial system settings, and demo accounts:

```bash
# From the project root
npm run seed

# OR directly inside the server folder
cd server
npm run seed
```

---

### 5. Start the Application

You can start **both the backend and frontend simultaneously** with a single command from the root directory:

```bash
npm run dev
```

> **What happens:**
> - Backend Server boots on `http://localhost:5000`
> - PostgreSQL connection pool connects and verifies
> - Vite Frontend launches on `http://localhost:5173`

Alternatively, you can run them in two separate terminal windows:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Pre-Seeded Demo Accounts

For hackathon judges, reviewers, and local testing, pre-seeded accounts are provided with pre-loaded bookings, ratings, and history:

| Persona | Email | Password | Role / Access Details |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@sahaayak.com` | `Admin@123` | Full administrative oversight (2FA demo code: `123456`) |
| **Customer** | `priya.sharma@example.com` | `Customer@123` | Bangalore customer with active booking in HSR Layout |
| **Customer** | `rahul.verma@example.com` | `Customer@123` | Koramangala customer with completed bookings |
| **Worker (Cleaner)** | `ramesh.cleaner@example.com` | `Worker@123` | 4.9★ Cleaning & Car Wash Partner |
| **Worker (Plumber)** | `suresh.plumber@example.com` | `Worker@123` | 4.8★ Plumbing & Electrical Partner |
| **Worker (AC Tech)** | `vikram.ac@example.com` | `Worker@123` | 4.9★ AC Specialist |
| **Worker (Salon)** | `anita.beauty@example.com` | `Worker@123` | 5.0★ Beauty & Wellness Partner |

> 💡 **Tip:** Use the **⚡ 1-Click Role Switcher** top banner in the app to switch between Admin, Customer, and Worker personas instantly without typing passwords.

---

## 💎 Core Features & Portals

### 1. Customer Experience
- Hyperlocal service browsing across 6 sectors (Cleaning, Repairs, Home Improvement, Auto Care, Beauty, Logistics).
- Multi-step booking wizard with address selection, preferred time slots, and transparent upfront cost breakdown.
- Live booking status timeline: `Pending` ➔ `Assigned` ➔ `In Route` ➔ `In Progress` ➔ `Completed`.
- Secure completion via **4-Digit Customer OTP** verified by worker on arrival.
- **Pay After Service:** Integrated checkout with zero upfront lock-in.

### 2. Gig Partner Portal
- **Real-Time Dispatch Radar:** Audible/visual prompt for incoming jobs with distance and estimated payout.
- **1-Tap Online/Offline Switch:** GPS-assisted location updates for immediate matching.
- **Transparent Earnings Ledger:** Total earnings, tips (100% retained), and payment settlement status.
- **Proof of Work Upload:** Capture before & after job photographs directly into the booking ticket.

### 3. Admin Command Center
- **Algorithmic Weight Controls:** Fine-tune distance weight, workload balance, rating influence, and fairness rotation in real-time without restarting the server.
- **Zero-Commission Threshold Engine:** Adjust minimum protection thresholds (default ₹599) and commission percentages.
- **Worker Verification Queue:** Review government identity documents, Aadhaar verification, and trade skill certifications with 1-click approve/reject.
- **Dispute Resolution & Audit:** Oversee complaints, review logs, and export full CSV compliance reports.

---

## 🔧 Troubleshooting

### Q: Why do I see "Cannot connect to Sahaayak server"?
- Ensure the backend server is running on **port 5000**.
- Check `netstat -ano | findstr :5000` (Windows) or `lsof -i :5000` (Mac/Linux) to confirm port availability.

### Q: Why does the backend fail to start with a database error?
- Sahaayak runs strictly on PostgreSQL. Verify that your `DATABASE_URL` in `server/.env` is active and reachable.
- If using Neon Cloud, ensure the URL includes `?sslmode=require`.

### Q: How do I re-seed or reset demo data?
Run the following from your terminal:
```bash
cd server
node database/init.js
```

---

## 📜 License

This project is developed for the **Smart India Hackathon (SIH)**. Distributed under the **MIT License**.
