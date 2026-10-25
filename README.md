# 🛡️ SE Lab 5 - Full-Stack Role-Based Authentication & User Portal

An enterprise-grade, modern full-stack web application designed for **Software Engineering Lab 5**. Built with **React 18, Vite, Tailwind CSS, Node.js, Express, and MongoDB**, featuring secure JWT authentication, bcrypt password encryption, role-based dashboards, and password recovery.

---

## ✨ Features

- 🔐 **Secure Authentication**:
  - User Registration with client & server-side validation.
  - Password strength meter (Weak / Fair / Good / Strong).
  - Secure Login with bcrypt-hashed passwords and JSON Web Tokens (JWT).
  - Quick-fill test buttons for instant evaluator demonstration.
- 🔑 **Password Recovery (Forgot Password Flow)**:
  - Generates secure cryptographic reset tokens with 1-hour expiration.
  - Interactive reset UI to change password with token verification.
- 👥 **Role-Based Access Control (RBAC)**:
  - **Standard User**: View account status, edit profile details, update password.
  - **Administrator**: Live analytics cards (total users, admin count, regular users, system health), interactive User Management Table with search, role promotion/demotion, and user deletion.
- 🎨 **Modern Design & UX**:
  - Glassmorphic slate/indigo aesthetic with smooth transitions and glow accents.
  - Feather icons with `lucide-react`.
  - Non-intrusive alert notification banners (no dated browser `alert()` popups).
  - Responsive layout for desktop, tablet, and mobile.
- 🚀 **Production-Ready Deployment**:
  - Optimized production build using Vite.
  - Backend statically serves the built frontend for a unified, single-service deployment on **Render** (zero CORS problems, 100% free tier compatible).

---

## 📁 Project Architecture

```
se_lab_5/
├── backend/
│   ├── middleware/
│   │   └── auth.js             # JWT verification & admin authorization
│   ├── models/
│   │   └── User.js             # User Mongoose schema & bcrypt hooks
│   ├── routes/
│   │   ├── auth.js             # /register, /login, /forgot-password, /reset-password, /me
│   │   └── user.js             # /dashboard, /profile/edit, /change-password, /admin/users
│   ├── .env                    # Environment configuration
│   ├── .env.example            # Template for environment variables
│   ├── package.json            # Backend dependencies
│   └── server.js               # Express application & static file server
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx   # Role-based dashboard (Admin vs User)
│   │   │   ├── EditProfile.jsx # Profile information & password changer
│   │   │   ├── ForgotPassword.jsx # 2-step token reset flow
│   │   │   ├── Login.jsx       # Login card with demo helpers
│   │   │   ├── Navbar.jsx      # Navigation bar with user badge
│   │   │   └── Register.jsx    # Registration with strength meter
│   │   ├── services/
│   │   │   └── api.js          # Axios client with JWT interceptor
│   │   ├── App.jsx             # React router & protected routes
│   │   ├── index.css           # Tailwind CSS directives & glass styles
│   │   └── main.jsx            # React root mount
│   ├── index.html              # Vite entry HTML
│   ├── package.json            # Frontend dependencies
│   ├── tailwind.config.js      # Tailwind configuration
│   └── vite.config.js          # Vite config & API reverse proxy
├── package.json                # Root automation scripts
├── render.yaml                 # Render Blueprint for 1-click deployment
└── README.md                   # Documentation & deployment guide
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18+ (Node.js LTS 24 installed)
- **MongoDB**: Local MongoDB Server running OR a free MongoDB Atlas connection string.

### 2. Quick Start (Run Both Frontend & Backend)

Open **Terminal 1** (Backend):
```powershell
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5000`.*

Open **Terminal 2** (Frontend Dev Server):
```powershell
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with instant hot reloading.*

---

### 3. Unified Mode (Run Full-Stack from a Single Port)

You can also run both the frontend and backend together on `http://localhost:5000`:

```powershell
# In the root directory:
npm run build
npm start
```
Visit `http://localhost:5000` in your browser.

---

## ☁️ MongoDB Atlas Setup (Required for Render)

Render does not host free databases locally, so using **MongoDB Atlas** (100% Free 512MB tier) is standard:

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign in/register.
2. Click **Create a Deployment** → Choose **M0 (Free)**.
3. Under **Security Quickstart**:
   - Create a database user (e.g., username `admin` and a strong password).
   - Under **Network Access**, select **Allow Access from Anywhere** (`0.0.0.0/0`).
4. Click **Connect** → Choose **Drivers** (Node.js).
5. Copy your connection string:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/selab5?retryWrites=true&w=majority
   ```
6. Paste this URI into `backend/.env` (and into Render's Environment Variables during deployment).

---

## 🚀 Deployment to Render

### Method 1: Render Blueprint (Recommended - 1-Click)

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Complete SE Lab 5 with modern UI and deployment configs"
   git push origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository `se_lab_5`.
5. Render will automatically detect `render.yaml`.
6. Under environment variables, enter your `MONGO_URI` from MongoDB Atlas.
7. Click **Apply**. Render will build and deploy your app with a public URL!

---

### Method 2: Manual Web Service Setup

If you prefer to configure manually on Render:

1. Click **New +** → **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `se-lab-5-portal`
   - **Environment**: `Node`
   - **Region**: Any (e.g. `Oregon (US West)` or `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `JWT_SECRET` | *(Any long random string)* |
   | `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/selab5?retryWrites=true&w=majority` |
5. Click **Deploy Web Service**.
6. Once deployed, open the Render URL (`https://se-lab-5-portal.onrender.com`).

---

## 📡 REST API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user (`username`, `email`, `password`, `role`) |
| `POST` | `/api/auth/login` | Public | Authenticate user & receive JWT token |
| `POST` | `/api/auth/forgot-password` | Public | Request 1-hour password reset token |
| `POST` | `/api/auth/reset-password` | Public | Reset password with token (`token`, `newPassword`) |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current session user info |
| `GET` | `/api/user/dashboard` | Authenticated | Fetch personalized dashboard & stats |
| `PUT` | `/api/user/profile/edit` | Authenticated | Update username & email |
| `PUT` | `/api/user/change-password` | Authenticated | Update password while logged in |
| `GET` | `/api/user/admin/users` | Admin Only | List all registered users |
| `PATCH`| `/api/user/admin/users/:id/role` | Admin Only | Promote or demote user role |
| `DELETE`| `/api/user/admin/users/:id` | Admin Only | Delete user account |
| `GET` | `/api/health` | Public | System status and database probe |

---

## 🧪 Quick Test Demo Credentials

You can register any new user with the `user` or `admin` role, or use the one-click demo fillers on the Login page:

- **Admin Account**:
  - Email: `admin@example.com`
  - Password: `admin123`
- **User Account**:
  - Email: `user@example.com`
  - Password: `user123`
