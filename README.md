# NHETIS Career Advisor - Production-Grade Hackathon Solution

**Status:** Implementation Ready (MERN Stack)
**Objective:** One-Stop Personalized Career & Education Advisor for Government College Enrollment Improvement.

## 🚀 Key Features

1.  **Microservice-Style Modular Monolith**: Scalable backend architecture.
2.  **AI Recommendation Engine**: Hybrid Rule-Based + Cosine Similarity Vector Matching (No Paid APIs).
3.  **Geo-Spatial College Discovery**: Find nearby government colleges using MongoDB `2dsphere` index.
4.  **Offline-First**: Designed for PWA with Service Workers and Local Caching.
5.  **Role-Based Access Control**: Secure Student and Admin portals.

## 📂 Project Structure

```
Career-Advisor-Nhetis/
├── backend/                 # Node.js + Express
│   ├── src/
│   │   ├── config/          # DB & Env Config
│   │   ├── controllers/     # Logic (User, Career, College)
│   │   ├── middleware/      # Auth, Error Handling
│   │   ├── models/          # Mongoose Schemas (GeoJSON enabled)
│   │   ├── routes/          # API Definitions
│   │   ├── services/        # Business Logic
│   │   └── server.js        # Entry Point
│   └── data/                # Seed Data (JSON)
│
├── frontend/                # React + Vite
│   ├── src/
│   │   ├── api/             # Axios Instances
│   │   ├── components/      # Reusable UI
│   │   ├── context/         # Global State (Auth, Offline)
│   │   ├── pages/           # Views
│   │   └── App.tsx          # Main Router
│   └── public/              # Static Assets
└── ARCHITECTURE_PLAN.md     # Detailed System Blueprint
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas Account (Free Tier) or Local MongoDB

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Note: Create a `.env` file in `backend/` with `MONGO_URI` and `JWT_SECRET`.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Database Seeding
POST request to `http://localhost:5000/api/careers/seed` to populate initial data.

## 🏗️ Architecture & APIs

- **Auth**: JWT based (`/api/users/login`, `/api/users/profile`)
- **Recommendation**: `/api/careers/recommend` (Accepts Quiz Scores & Interests)
- **Colleges**: `/api/colleges?lat=...&lng=...` (Geo-spatial search)

See `ARCHITECTURE_PLAN.md` for the full schematic.