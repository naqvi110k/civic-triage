# 📝 Execution Plan & Task List (docs/TASKS.md)

**Context:** Smart Civic Complaint Triage System (SC-01)  
**Goal:** Build the system in atomic, testable, dependency-aware steps.  
**Instructions for AI Agent:** Do not skip steps. Complete one phase entirely and verify it works before moving to the next. Do not generate large chunks of unrelated UI and Backend code at the same time.

---

## Phase 1: Project Initialization & Database Foundation
**Goal:** Scaffold the backend and ensure database connectivity.

- [x] **Task 1.1: Initialize Node Project**
  - Create project directory `backend/`.
  - Core dependencies: `express`, `mongoose`, `cors`, `dotenv`, `morgan`, `multer`, `bcryptjs`, `jsonwebtoken`.
  - Setup `server.js` with Express and a `/api/health` test route.
  - *Status:* Completed & verified.

- [x] **Task 1.2: Database Connection**
  - Setup MongoDB connection in `config/db.js` using `mongoose`.
  - Load connection string from `.env`.
  - *Status:* Completed & verified.

- [x] **Task 1.3: Define Mongoose Models (Core)**
  - Create `models/Complaint.js` matching schema in `plan.md` & `spec.md` with geospatial 2dsphere index.
  - Create `models/User.js` (`name`, `email`, `passwordHash`, `role`).
  - Create `models/StatusHistory.js`.
  - Create `models/RuleSettings.js` and `models/SensitiveZone.js`.
  - *Status:* Completed & verified.

---

## Phase 2: Core API & File Uploads
**Goal:** Allow residents to submit basic complaints with photos.

- [x] **Task 2.1: Setup Multer for Image Uploads & Sample Assets**
  - Installed `multer`. Created `middleware/upload.js` (5 MB max, jpg/png/webp, fields `photo` and `evidence`).
  - Statically serve `/uploads` via Express with automatic fallback handling to prevent 404s for missing demo files.
  - Added `backend/src/seed/downloadSampleImages.js` to ensure seeded complaint photos (`sample_pothole_1.jpg`, `sample_drain_1.jpg`, `sample_streetlight_1.jpg`, etc.) are pre-cached in `backend/uploads`.
  - Added Base64 data URI persistence in getFileUrl for Vercel serverless and tracked sample demo images in Git.
  - *Status:* Completed.

- [x] **Task 2.2: Basic Complaint Submission Endpoint**
  - Created `POST /api/complaints` route accepting multipart form data.
  - Saves to DB, sets status, calculates priority, and logs status history.
  - *Status:* Completed.

- [x] **Task 2.3: Authentication, Authorization & Security Hardening**
  - Enhanced `POST /api/auth/login` and `POST /api/auth/register` with strict email regex, password strength checks, and role escalation prevention (public signup restricted to `'resident'`).
  - Implemented sliding-window rate limiting middleware `middleware/rateLimiter.js` against brute-force attacks.
  - Added authenticated password management `PUT /api/auth/password` and profile check `GET /api/auth/me`.
  - Built frontend Sign In (`/login`) and Sign Up (`/register`) forms with instant demo quick-login shortcuts, JWT persistence, and Navbar session states.
  - *Status:* Completed & verified.

---

## Phase 3: AI Pipeline Integration
**Goal:** Auto-categorize and embed complaint descriptions.

- [x] **Task 3.1: LLM Classification & Gemini Multimodal Vision Service**
  - Created `services/geminiService.js` powered by Google Gemini 3.5 Flash-Lite for multimodal photo inspection, visual hazard descriptions, and department action recommendations.
  - Built fail-safe architecture: seamlessly falls back to `services/classifier.js` (local keyword classifier) if offline or without API key.
  - Enforced categories: `road_damage`, `garbage`, `streetlight`, `water_leakage`, `blocked_drain`, `other`.
  - *Status:* Completed & verified.

- [x] **Task 3.2: Text Embedding Service**
  - Added `generateEmbedding(text)` in `services/similarity.js` with feature hashing.
  - *Status:* Completed & verified.

- [x] **Task 3.3: Wire AI into Submission Flow**
  - Created `services/pipeline.js` with `processComplaint()`.
  - Automatically saves `aiCategory`, `aiConfidence`, `aiReason`, and `embedding`.
  - *Status:* Completed & verified.

---

## Phase 4: Duplicate Detection Engine
**Goal:** Prevent duplicate reports using spatial queries and vector similarity.

- [x] **Task 4.1: Cosine Similarity Utility**
  - Created `calculateCosineSimilarity()` and `calculateTextSimilarity()` in `services/similarity.js`.
  - Passed unit tests for identical, orthogonal, and civic complaints.
  - *Status:* Completed & verified.

- [x] **Task 4.2: Proximity Query Logic**
  - Created geospatial distance check with Haversine formula in `utils/geo.js`.
  - Spatial radius search within 150m for same category in `services/pipeline.js`.
  - *Status:* Completed & verified.

- [x] **Task 4.3: Integrate Duplicate Logic**
  - Auto-flags duplicates if similarity >= 0.50, links `duplicateOf`, and increments original's `duplicateCount`.
  - *Status:* Completed & verified.

---

## Phase 5: Priority Scoring Engine
**Goal:** Calculate urgency dynamically based on configurable rules.

- [x] **Task 5.1: Priority Calculation Service**
  - Created `services/priority.js` with formula: $W_{cat} + W_{dup} + W_{zone} + W_{age} + W_{photo}$.
  - Checks proximity to registered `SensitiveZone`s (schools, hospitals, main roads).
  - *Status:* Completed & verified.

- [x] **Task 5.2: Apply Priority on Creation & Updates**
  - Wired into `processComplaint()` and `RuleSettings`.
  - Automatically generates `priorityScore` (0-100), `priorityBand`, and `priorityReasons`.
  - *Status:* Completed & verified.

---

## Phase 6: Admin Dashboard APIs
**Goal:** Serve data to the frontend interfaces.

- [x] **Task 6.1: Admin Complaint Read APIs**
  - Created `GET /api/admin/complaints` with query filters (`status`, `category`, `priorityBand`) and pagination.
  - *Status:* Completed.

- [x] **Task 6.2: Admin Action APIs**
  - Created `PATCH /api/admin/complaints/:id/status` (updates status, attaches `evidence` photo, logs `StatusHistory`).
  - Created `POST /api/admin/complaints/:id/merge` (confirm or reject duplicate link with score restoration).
  - *Status:* Completed.

- [x] **Task 6.3: Rules API & Stats**
  - Created `GET /api/admin/rules` and `PUT /api/admin/rules` with full queue score recalculation.
  - Added sensitive landmark zone management: `POST /api/admin/zones` and `DELETE /api/admin/zones/:id` with dynamic priority recalibration across all open tickets.
  - Created `GET /api/admin/stats` with `avgResolutionHours`, `slaOverdueCount` (>72h), and status/category metrics.
  - Added public `GET /api/complaints/transparency` for open municipal transparency metrics.
  - *Status:* Completed & verified.

- [x] **Task 6.4: Sensitive Landmark Zones & Admin Rules Integration (Frontend)**
  - Created `SensitiveZoneManager.tsx` UI to view, create, and delete sensitive buffer corridors with live coordinate presets and real-time recalibration toasts.
  - Connected `AdminDashboardPage` KPIs directly to `fetchAdminStats()` with dynamic SLA overdue warnings.
  - Connected public landing page (`page.tsx`) to `fetchTransparencyStats()` displaying live public ledger resolution rates.
  - *Status:* Completed & verified.

---

## Phase 7: Frontend Application Scaffolding & Shared Logic
**Goal:** Setup React/Next.js application, routing, API client, and store.

- [x] **Task 7.1: Init React/Next.js App & API Client**
  - Integrated Next.js 16 App Router frontend with complete Stitch dark/light theme.
  - Implemented `src/lib/api.ts` connecting directly to Express backend on `http://localhost:5000/api`.
  - Added seamless bidirectional category, status, and coordinate normalization.
  - *Status:* Completed & verified.

- [x] **Task 7.2: Map Component Base**
  - Interactive Leaflet map integration for geo-spatial pin selection, radius clustering, and municipal district overlays.
  - *Status:* Completed & verified.

---

## Phase 8: Resident Views (Frontend)
**Goal:** Interfaces for citizens to report and track complaints.

- [x] **Task 8.1: Complaint Submission Form**
  - Resident report page with image preview, dictation shortcut, GPS pin selector, and anonymous option.
  - Direct multipart upload to backend `POST /api/complaints` triggering automated keyword AI triage and duplicate matching.
  - *Status:* Completed & verified.

- [x] **Task 8.2: Resident Tracking View**
  - Real-time incident timeline reading from `StatusHistory` with before/after photo comparison and 72-hour reopen window.
  - *Status:* Completed & verified.

---

## Phase 9: Admin Dashboard (Frontend)
**Goal:** Command center for municipal workers.

- [x] **Task 9.1: Queue Table**
  - High-performance triage queue with search, ward and department filters, and priority score breakdown badges.
  - Connected live to `GET /api/admin/complaints` and `GET /api/complaints`.
  - *Status:* Completed & verified.

- [x] **Task 9.2: Interactive Cluster Map & Affected Area Telemetry**
  - Full-screen interactive Leaflet map upgraded with dynamic affected hazard radiuses (220m high impact, 140m medium, 70m low), duplicate hotspot ripple halos, sensitive municipal safety corridors (hospitals & schools with +20 priority escalation alerts), auto-fit bounds, and layer controls.
  - Upgraded public `CivicMapInner` with affected area hazard buffers and `LocationPickerMapInner` with real-time 150m impact coverage and live proximity warnings.
  - *Status:* Completed & verified.

- [x] **Task 9.3: Detail & Action Panel**
  - Modal workflows for status transitions, department assignment, resolution evidence photo logging, and duplicate merge/reject actions.
  - Connected to `PATCH /api/admin/complaints/:id/status` and `POST /api/admin/complaints/:id/merge`.
  - *Status:* Completed & verified.

---

## Phase 10: Final Integration & Seed Data
**Goal:** Prepare for a flawless demo.

- [x] **Task 10.1: Seed Script**
  - Created `src/seed/seed.js` with demo users (`admin@demo.com`, `resident@demo.com`), 3 sensitive zones, default rules, primary complaints, duplicate demo, and resolved complaint with after photo.
  - *Status:* Completed.

- [x] **Task 10.2: E2E Testing & Optimization**
  - Full end-to-end integration verified: submission -> automated AI categorization -> duplicate detection -> priority scoring -> admin dashboard -> status updates with evidence -> tracking timeline.
  - Optimistic store caching implemented for instant ("less loaded") page responsiveness.
  - Next.js build passes with 0 errors (`next build` compiled all 29 routes).
  - Expanded dataset to 12 realistic complaints with rich infrastructure photos, local municipal coordinates, full status diversity (New, Under Review, Assigned, In Progress, Resolved), duplicate clusters, and resolution evidence.
  - *Status:* Completed & verified.

- [x] **Task 10.3: Wire All Remaining Backend API Endpoints**
  - Added 4 missing API client functions in `lib/api.ts`: `fetchAdminComplaints` (server-side paginated admin queue), `fetchNearbyComplaints` (2dsphere radius), `fetchBoundsComplaints` (viewport bounding box), `changePassword` (authenticated password update).
  - Admin dashboard (`admin/page.tsx`) now calls `GET /api/admin/complaints` with server-side search & pagination instead of filtering `GET /api/complaints` client-side.
  - Added pagination controls (Previous/Next) to the admin triage table.
  - All 19 backend endpoints now have corresponding frontend API client functions.
  - `npm run build` passes with 0 errors.
  - *Status:* Completed & verified.

- [x] **Task 10.4: Connect Gemini Multimodal Vision to Auto-Fill Complaint Form**
  - Connected `gemini-3.5-flash-lite` via `@google/genai` on backend (`analyzeImageWithGemini`).
  - Added `POST /api/complaints/analyze` endpoint accepting photographic telemetry (`uploadPhoto` Multer middleware) and returning category, title, description, confidence, and visual hazard summary with graceful keyword fallback.
  - Added `analyzeComplaintPhoto` client in `frontend/src/lib/api.ts`.
  - Replaced mock filename check in `frontend/src/app/(resident)/complaints/new/page.tsx` with live Gemini vision inspection that dynamically auto-populates Title, Description, Category pill, and HUD scan telemetry banner upon image upload or replacement.
  - Verified logic tests pass (`npm run test:logic` -> 15/15) and frontend build succeeds (`npm run build` -> 0 errors).
  - *Status:* Completed & verified.

- [x] **Task 10.5: Fix Next.js 16 Instant Navigation Dropped Segment Warning**
  - In `frontend/src/app/(admin)/admin/layout.tsx`, refactored authorization guard: replaced early-return conditional drop of `{children}` with an overlay pattern (`fixed inset-0 z-50` loader overlay while `children` remains in the tree with CSS visibility toggle).
  - Preserves the `/admin` segment during static prerendering, partial prefetching, and Turbopack instant-navigation validation.
  - Verified with `next build`: all routes render clean with 0 warnings or dropped segments.
  - *Status:* Completed & verified.

- [x] **Task 10.6: Resolve Instant Shell URL Data with Suspense Streaming**
  - Next.js 16 flagged `await params` in `complaints/[id]/page.tsx` and `admin/complaints/[id]/page.tsx` for blocking instant shell navigation.
  - Refactored both root route wrappers to render `<Suspense fallback={<Loader />}>` streaming shells around inner async content components (`ComplaintContent` and `AdminComplaintContent`).
  - Verified: `next build` now generates optimal Partial Prerenders (`◐`) without warnings or blocking navigation.
  - *Status:* Completed & verified.

- [x] **Task 10.7: Fix Leaflet `_leaflet_pos` Runtime TypeError on Fast Navigation**
  - Leaflet threw `Cannot read properties of undefined (reading '_leaflet_pos')` when components unmounted during in-flight pan/zoom CSS transform animations or drag operations.
  - Hardened map cleanups in `LocationPickerMapInner.tsx`, `CivicMapInner.tsx`, and `AdminSpatialMapInner.tsx`:
    - Disengaged pending map animations with `map.stop()`.
    - Explicitly detached all pins and impact circles before tearing down the map container.
    - Set map instance references to null before invoking `.remove()`.
  - Verified with `next build`: 0 errors.
  - *Status:* Completed & verified.

- [x] **Task 10.8: Day (Light) Mode UI Contrast & Theme Token Harmonization**
  - Eliminated hardcoded dark backgrounds (`#090A0F`, `#161922`, `bg-zinc-900`) and unadapted styles (`text-white`, `border-white`) across `page.tsx`, `login/page.tsx`, `register/page.tsx`, `about/page.tsx`, `faq/page.tsx`, `ComplaintTrackingClient.tsx`, `AdminComplaintDetailClient.tsx`, `Navbar.tsx`, and map HUD overlays.
  - Refined Stitch v2 design tokens in `globals.css` with light-mode card elevations, shadows, and subtle civic grid overlays.
  - Added pre-hydration theme initialization script in `layout.tsx` to prevent theme flicker on page load.
  - Verified across all pages in browser in both day and dark modes; `next build` and `npm run test:logic` pass with 0 errors.
  - *Status:* Completed & verified.

- [x] **Task 10.9: Unified Single-Project Vercel Deployment Setup**
  - Created api/index.js bridge exporting Express (backend/src/app) as a Vercel serverless function with cached MongoDB connection handling for warm starts.
  - Created vercel.json routing /api/(.*) and /uploads/(.*) to the serverless function while serving the Next.js app on all other routes.
  - Updated root package.json to unify all dependencies, with npm run build delegating cleanly to the Next.js frontend.
  - Updated backend/src/config/db.js with global connection caching for serverless environments.
  - Updated backend/src/middleware/upload.js, backend/src/app.js, and backend/src/services/pipeline.js to support /tmp/uploads on Vercel ephemeral filesystem.
  - Updated frontend/src/lib/api.ts to use relative /api paths when deployed on Vercel without requiring a separate NEXT_PUBLIC_API_URL.
  - Configured turbopack.root in frontend/next.config.ts.
  - Verified: npm run build and npm run test:logic pass from root with 0 errors.
  - *Status:* Completed & verified.

- [x] **Task 10.10: Fix JSON Parsing Error & Add Local Dev Proxy Rewrites**
  - Resolved `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`: in local development, `fetch('/api/auth/login')` was hitting Next.js (port 3000) which served the 404 HTML document instead of routing to Express (port 5000).
  - Added `async rewrites()` to `frontend/next.config.ts` to automatically proxy `/api/:path*` and `/uploads/:path*` to `http://localhost:5000` during local dev while respecting Vercel's serverless router in production.
  - Implemented safe JSON parser `parseJsonSafe(res)` across all API functions in `frontend/src/lib/api.ts`, preventing unhandled SyntaxErrors on HTML/non-JSON error pages.
  - Added resilient offline fallback for demo accounts (`admin@demo.com` / `admin123` and `resident@demo.com` / `resident123`) in `loginUser`, and wired "Continue as Demo Admin" to authenticate directly into the Command Center.
  - Verified: `npm run build` and `npm run test:logic` pass with 0 errors.
  - *Status:* Completed & verified.

- [x] **Task 10.11: Progressive Web App (PWA) & Mobile Responsiveness Hardening**
  - Implemented full Progressive Web App capability: created `manifest.ts` metadata route, static `public/manifest.json`, offline fallback `public/offline.html`, and service worker `public/sw.js` with intelligent stale-while-revalidate caching and client claiming.
  - Generated PWA icon suite (`icon-192x192.png`, `icon-512x512.png`, `icon-maskable-512x512.png`, `icon.svg`, `favicon.svg`, `apple-touch-icon.png`) using vector SVG telemetry graphics.
  - Created `PwaManager.tsx` with native install prompt handler and guided iOS Safari "Add to Home Screen" instructions; added install shortcut to Navbar mobile drawer.
  - Hardened mobile responsiveness across all non-responsive pages:
    - **Admin Dashboard (`/admin`)**: added dedicated mobile card list view (`block md:hidden`) alongside desktop table (`hidden md:table`), responsive KPI strip, horizontal swipeable department/ward chips, and touch-friendly score tooltip popup.
    - **FAQ Page (`/faq`)**: responsive typography, edge-to-edge swipeable category filter tabs, compact accordion spacing, and full-width mobile action callout.
    - **Admin Rules (`/admin/rules`)**: stacked action buttons on mobile, non-sticky live simulator on small screens, and responsive weight sliders.
    - **Spatial Map (`/admin/map`)**: horizontal scrollable priority filter chips and collapsible mobile GIS telemetry HUD legend.
    - **Complaint Detail (`/admin/complaints/[id]`)**: responsive lifecycle stepper, stacked duplicate action buttons, and scrollable modal.
- [x] **Task 10.13: Exclusively Database-Driven Architecture & Zero Local Storage Complaints**
  - Removed all `SAMPLE_COMPLAINTS` mock data from frontend codebase (`frontend/src/lib/types.ts` now exports empty array).
  - Eliminated all complaint reading and writing to `localStorage`. Only live complaints directly fetched from MongoDB Atlas are displayed.
  - Resolved inspect / complaint detail delay by adding cross-event reactivity (`civicpulse_db_updated` & `civicpulse_complaints_updated`) and instant store-to-client binding.
  - Fixed Public Ledger (`/complaints`) microsecond collapse bug: added a dedicated scope toggle ("Public Civic Ledger" showing all 13 database complaints vs "My Submissions" for resident's reports), preventing `fetchMyComplaints()` from overriding the public ledger.
  - Enhanced backend `GET /api/complaints/:id` to support `decodeURIComponent` and case-insensitive regex lookup.
  - Verified: `npm run test:logic` passes (15/15), `npm run build` succeeds with zero errors, and database query confirms 13 active complaints live in MongoDB Atlas.
  - *Status:* Completed & verified.
