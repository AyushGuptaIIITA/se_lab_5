# 🏥 Telemedicine Appointment & e-Prescription Platform

A complete, production-ready Telemedicine web application implementing all 13 functional requirements from the SRS document. Built with **React 18 + Vite + TailwindCSS** (frontend) and **Node.js + Express + MongoDB** (backend).

---

## ✨ Features (FR Coverage)

| FR | Feature | Status |
|----|---------|--------|
| FR-1 | Patient & Doctor Registration with role-based profiles | ✅ |
| FR-2 | Secure Login / Logout with JWT | ✅ |
| FR-3 | Password Recovery (forgot/reset flow) | ✅ |
| FR-4 | Doctor Search by name/specialization + availability slots | ✅ |
| FR-5 | Appointment Booking with double-booking prevention | ✅ |
| FR-6 | Video Consultation Room with network-event handling & auto-reconnect | ✅ |
| FR-7 | Digital e-Prescription with SHA-256 signature | ✅ |
| FR-8 | Send Prescription to Pharmacy (simulated adapter) | ✅ |
| FR-9 | Medical Records viewer (patient own + doctor access) | ✅ |
| FR-10 | Admin User Management (activate/suspend/delete) | ✅ |
| FR-11 | Role-Based Access Control (Patient / Doctor / Admin) | ✅ |
| FR-12 | Audit Logging (all sensitive actions logged) | ✅ |
| FR-13 | Multi-language Support (English / Hindi) | ✅ |

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS 3, React Router v6, Axios, Lucide Icons |
| Backend | Node.js, Express.js, Mongoose |
| Database | MongoDB (Atlas for production, local for dev) |
| Auth | JSON Web Tokens (JWT), bcryptjs |
| Deploy | Render (single unified service) |

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** v18+ — [Download](https://nodejs.org/)
- **MongoDB Community** — [Download](https://www.mongodb.com/try/download/community) **OR** [MongoDB Atlas](https://cloud.mongodb.com) (free)
- **Git**

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/se_lab_5.git
cd se_lab_5
```

### 2. Configure Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/telemedicine   # or your Atlas URI
JWT_SECRET=your_super_secret_key_here_change_this
NODE_ENV=development
```

### 3. Install Dependencies
```bash
# From repo root:
npm run install:all
```

Or individually:
```bash
npm install --prefix backend
npm install --prefix frontend
```

### 4. Seed Demo Data
Make sure MongoDB is running, then:
```bash
cd backend
node seed.js
```

This creates **6 demo accounts**:

| Role | Email | Password |
|------|-------|----------|
| Patient | patient1@demo.com | password123 |
| Patient | patient2@demo.com | password123 |
| Doctor (General Medicine) | dr.sharma@demo.com | password123 |
| Doctor (Pediatrics) | dr.patel@demo.com | password123 |
| Doctor (Cardiology) | dr.gupta@demo.com | password123 |
| Admin | admin@demo.com | password123 |

### 5. Start Development Servers

**Option A — Two terminals (recommended)**
```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

**Option B — From root**
```bash
npm run dev:backend   # starts backend on :5000
npm run dev:frontend  # starts frontend on :5173
```

Open **http://localhost:5173** in your browser.

---

## 🏗️ Production Build (local test)

```bash
# Build frontend
cd frontend
npm run build

# Start production server (serves built frontend from Express)
cd ..
NODE_ENV=production node backend/server.js
```

Open **http://localhost:5000**

---

## ☁️ Deploy to Render

### Step 1 — Push to GitHub
```bash
git add .
git commit -m "feat: complete telemedicine platform"
git push origin main
```

### Step 2 — Create MongoDB Atlas Database
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster
2. Database Access → Add user (username + password)
3. Network Access → Allow from anywhere (`0.0.0.0/0`)
4. Connect → Get connection string, e.g.:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/telemedicine?retryWrites=true&w=majority
   ```

### Step 3 — Create Render Web Service
1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo `se_lab_5`
3. Configure:

| Setting | Value |
|---------|-------|
| **Environment** | Node |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Root Directory** | *(leave blank)* |

4. Add Environment Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGO_URI` | *your Atlas connection string* |
| `JWT_SECRET` | *a strong random string (32+ chars)* |

5. Click **Create Web Service** → wait ~3 minutes for build

### Step 4 — Seed Production Database
After first deploy, open Render **Shell** tab and run:
```bash
node backend/seed.js
```

Your app will be live at `https://your-service-name.onrender.com` 🎉

> **Note:** Free Render services spin down after 15 min of inactivity; first load after idle takes ~30s.

---

## 📁 Project Structure

```
se_lab_5/
├── backend/
│   ├── middleware/
│   │   ├── auth.js           # JWT verify + role guards
│   │   └── auditLog.js       # Audit log helper
│   ├── models/
│   │   ├── User.js           # Patient/Doctor/Admin schema
│   │   ├── Appointment.js
│   │   ├── Prescription.js   # With digital signature
│   │   ├── ConsultationSession.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.js           # Register, Login, Reset password
│   │   ├── doctors.js        # Search, availability, schedule
│   │   ├── appointments.js   # CRUD + status management
│   │   ├── consultation.js   # Start/end sessions
│   │   ├── prescriptions.js  # Create, sign, send to pharmacy
│   │   ├── medicalRecords.js
│   │   └── admin.js          # User management, reports, audit
│   ├── utils/
│   │   └── pharmacyAdapter.js
│   ├── server.js
│   ├── seed.js
│   └── .env
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── Profile.jsx
│       │   ├── patient/
│       │   │   ├── Dashboard.jsx
│       │   │   ├── SearchDoctors.jsx
│       │   │   └── MedicalRecords.jsx
│       │   ├── doctor/
│       │   │   ├── Dashboard.jsx
│       │   │   ├── ManageSchedule.jsx
│       │   │   ├── ConsultationRoom.jsx
│       │   │   └── PrescriptionForm.jsx
│       │   └── admin/
│       │       ├── Dashboard.jsx
│       │       ├── UserManagement.jsx
│       │       ├── Reports.jsx
│       │       └── AuditLogs.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Layout.jsx
│       │   ├── AlertBanner.jsx
│       │   └── StatusBadge.jsx
│       ├── contexts/
│       │   ├── AuthContext.jsx
│       │   └── LanguageContext.jsx
│       ├── services/api.js
│       ├── translations/
│       │   ├── en.js
│       │   └── hi.js
│       └── App.jsx
│
├── render.yaml               # Render deployment config
├── package.json              # Root scripts
└── README.md
```

---

## 🔐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Get JWT token |
| POST | `/api/auth/forgot-password` | Public | Request reset token |
| POST | `/api/auth/reset-password` | Public | Reset with token |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/doctors` | JWT | List/search doctors |
| GET | `/api/doctors/:id/availability` | JWT | Get available slots |
| POST | `/api/appointments` | Patient | Book appointment |
| GET | `/api/appointments` | JWT | My appointments |
| PATCH | `/api/appointments/:id/status` | Doctor/Admin | Confirm/cancel |
| POST | `/api/consultation/start` | Doctor | Start session |
| POST | `/api/consultation/:id/end` | Doctor | End session |
| POST | `/api/prescriptions` | Doctor | Create prescription |
| POST | `/api/prescriptions/:id/send-to-pharmacy` | Doctor | Send to pharmacy |
| GET | `/api/medical-records` | Patient | Own records |
| GET | `/api/admin/users` | Admin | All users |
| PATCH | `/api/admin/users/:id/status` | Admin | Activate/suspend |
| GET | `/api/admin/reports` | Admin | Platform analytics |
| GET | `/api/admin/audit-logs` | Admin | Audit trail |
| GET | `/api/health` | Public | Health check |

---

## 🎨 UI Design

- **Theme**: Dark glassmorphic — `bg-slate-950` base with indigo/violet/teal gradients  
- **Font**: Plus Jakarta Sans (Google Fonts)  
- **Icons**: Lucide React  
- **CSS**: Custom `glass-panel`, `glass-card`, `glass-input` utility classes  
- **Responsive**: Mobile-first, works on all screen sizes  

---

## 👨‍💻 Author

**Ayush Gupta** — SE Lab 5
