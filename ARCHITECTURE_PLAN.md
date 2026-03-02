# NHETIS Career Advisor - Architectural Blueprint & Plan

**Role:** Senior Software Architect, MERN Stack Expert
**Focus:** Production-Grade Hackathon Solution (100K+ Users, Mobile-First, Offline-Ready)
**Stack:** MERN (MongoDB, Express, React, Node)

---

## 1. System Architecture (Microservice-Style Monolith)

To meet the requirement for "microservice-style modules" while keeping deployment simple for a hackathon, we will use a **Modular Monolith** architecture. Each "service" has its own isolated folder structure (Routes, Controllers, Services, Models) but runs within a single Express application instance to share resources and simplify deployment.

### backend/
- **src/**
  - **config/** (DB connection, Env vars)
  - **middlewares/** (Auth, Error Handling, Rate Limiter)
  - **services/** (Business Logic Layer - The "Microservices")
    - **auth/** (JWT, User Management)
    - **student/** (Profile, Progress)
    - **aptitude/** (Quiz Engine, Analysis)
    - **recommendation/** (AI Engine)
    - **college/** (Discovery, Geo-Location)
    - **career/** (Career Paths)
    - **notification/** (Alerts, Push)
    - **timeline/** (Scheduler)
  - **models/** (Mongoose Schemas)
  - **routes/** (API Route Definitions)
  - **utils/** (Helpers, Constants)
  - **app.js** (Main App Entry)
  - **server.js** (Server Listener)

### frontend/
- **src/**
  - **api/** (Axios instances, Service endpoints)
  - **assets/** (Images, Icons)
  - **components/** (Reusable UI)
    - **common/** (Button, Card, Modal)
    - **layout/** (Navbar, Sidebar, Footer)
    - **features/** (Specific to modules like Quiz, Map)
  - **context/** (Global State - Auth, Theme, OfflineStatus)
  - **hooks/** (Custom Hooks - useGeoLocation, useOffline)
  - **pages/** (Route Components)
  - **services/** (Offline Sync Logic, IndexedDB wrappers)
  - **styles/** (CSS/SCSS or Styled Components)
  - **utils/** (Helpers)
  - **App.js** (Routes Setup)
  - **serviceWorker.js** (PWA Logic)

---

## 2. MongoDB Schema Design

We will use Mongoose schemas. Key collections based on requirements:

### Users Collection
```javascript
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true }, // Optional for rural students without email
  phone: { type: String, unique: true, required: true }, // Primary ID
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  profile: {
    grade: { type: String, enum: ['10', '12'] },
    stream: { type: String }, // For 12th grade
    board: { type: String },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number] // [longitude, latitude]
    },
    interests: [String],
    academicScore: Number
  },
  createdAt: { type: Date, default: Date.now }
});
UserSchema.index({ "profile.location": "2dsphere" });
```

### QuizResponses Collection
```javascript
const QuizResponseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  answers: [{
    questionId: String,
    selectedOption: String,
    category: String, // e.g., "Analytical", "Creative"
    score: Number
  }],
  result: {
    dominantTraits: [String], // e.g., ["Logical", "Artistic"]
    recommendedStreams: [String]
  },
  attemptedAt: { type: Date, default: Date.now }
});
```

### Colleges Collection (GeoJSON Support)
```javascript
const CollegeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Government', 'Private', 'Aided'] }, // Focus on Govt
  programs: [{ type: String }], // e.g., ["B.Tech", "B.Sc"]
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  address: String,
  website: String,
  ranking: Number,
  facilities: [String]
});
CollegeSchema.index({ location: "2dsphere" });
```

### CareerPaths Collection
```javascript
const CareerPathSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  requiredStream: String, // e.g., "Science"
  roadmap: [{
    step: String, // e.g., "Complete 12th", "Entrance Exam", "Degree"
    duration: String
  }],
  salary: { min: Number, max: Number },
  outcome: String // Job roles
});
```

### Other Collections
- **Scholarships**: { name, criteria, deadline, link }
- **StudyResources**: { title, type (PDF/Video), url, subject, grade }
- **Notifications**: { userId, message, type, isRead, createdAt }
- **AdmissionTimelines**: { event, date, description, type (Exam/Admission) }

---

## 3. Review of API Routes Structure

**Base URL:** `/api/v1`

### Auth Service
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Student Service
- `GET /student/profile`
- `PUT /student/profile` (Update interests, automated location)

### Aptitude Service
- `GET /aptitude/questions` (Cached for offline)
- `POST /aptitude/submit` (Calculates & stores results)

### Recommendation Service
- `POST /recommend/all` (Main engine: returns streams, colleges, careers)

### College Service
- `GET /colleges/nearby?lat=...&lng=...&radius=...`
- `GET /colleges/search?q=...`

### Resource Service
- `GET /resources?grade=10&subject=Math` (Downloadable)

---

## 4. Recommendation Algorithm Logic (The "AI" Engine)

We adhere to the constraint: **NO PAID AI APIs**. We use a hybrid logic engine.

**Flow:**
1.  **Input:** User Quiz Scores (Trait Vector), Academic Score, Interests Tags.
2.  **Phase 1: Rule-Based Filtering (Hard Constraints)**
    - If Grade = 10 & Math Score < 40% -> Exclude 'Science-PCM'.
    - If Interest != 'Art' -> Reduce 'Arts' stream weight.
3.  **Phase 2: Cosine Similarity (Vector Matching)**
    - We pre-define "Ideal Student Vectors" for each Stream/Career.
      - *Example:* Science Vector = { Logic: 0.9, Creativity: 0.3, Technical: 0.8 }
    - We generate a "User Vector" from Quiz Responses.
      - *Example:* User = { Logic: 0.7, Creativity: 0.4, Technical: 0.6 }
    - Calculate Cosine Similarity. Rank streams by score.
4.  **Phase 3: Weighted Decision Tree (Contextual adjustment)**
    - *Adjustment:* If User Location is "Rural" AND "Vocational" score is high -> Boost "Local Polytechnic Colleges".
5.  **Output:** Top 3 Streams, Top 5 Colleges (Distance Sorted), Top 3 Career Paths.

---

## 5. Offline Sync Flow (Service Workers & IndexedDB)

**Objective:** Allow students to take quizzes and view saved paths without internet.

1.  **Initial Load (Online):**
    - App loads. Service Worker caches bundle (React) + Static Assets.
    - `Redux Persist` or `Dexie.js` (IndexedDB wrapper) fetches & saves:
      - Quiz Questions
      - Basic Career Paths
      - Common Government Colleges List
2.  **Offline Mode:**
    - User goes offline.
    - **Quiz:** User takes quiz. Answers saved to `IndexedDB (pending_sync_quiz)`.
    - **Browsing:** User views cached Career Paths.
3.  **Back Online:**
    - `window.addEventListener('online')` triggers sync.
    - Background Service reads `pending_sync_quiz`.
    - Sends `POST /api/aptitude/submit`.
    - Updates local Redux state with new server recommendations.
    - Notification: "You're back online! Recommendations updated."

---

## 6. React Component Tree

- **App**
  - **AuthProvider** (Context)
  - **OfflineProvider** (Context)
  - **Layout**
    - **Navbar**
    - **Main Content** (Switch)
      - **Home** (Hero, Features)
      - **Dashboard** (Personalized View)
        - *StreamCard*
        - *CollegeMap* (Leaflet/Mapbox - OpenStreetMap)
        - *TimelineWidget*
      - **QuizPage** (Questions, Progress)
      - **CareerExplorer** (Visual Flowchart)
      - **Colleges** (List/Map Toggle)
      - **Profile**
      - **AdminPanel** (Protected)
    - **Footer**
  - **ToastNotification**

---

## 7. Development & Deployment Plan

### Step 1: Local Setup (Backend)
- Initialize Node.js.
- Install `express`, `mongoose`, `cors`, `dotenv`, `helmet`, `jsonwebtoken`.
- Setup separate folders for services.
- Connect to MongoDB Atlas (Free Tier).

### Step 2: Local Setup (Frontend)
- Initialize Vite React + TS (or JS).
- Install `axios`, `react-router-dom`, `redux-toolkit` (or Context), `framer-motion` (for "Wow" factor), `leaflet` (Maps).
- Setup PWA in `vite.config.js`.

### Step 3: Implementation
- **Day 1:** Auth, Profile, Quiz Engine (Backend + Frontend).
- **Day 2:** Recommendation Logic, College Map (OpenStreetMap), Offline Sync.

### Step 4: Deployment
- **Database:** MongoDB Atlas M0 Sandbox (Free).
- **Backend:** Render.com Web Service (Free Tier) - connects to Atlas.
- **Frontend:** Vercel (Free Tier) - easy CI/CD.

---

This plan adheres strictly to MERN, Free APIs, and Hackathon-Ready constraints.
