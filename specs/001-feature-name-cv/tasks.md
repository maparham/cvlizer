# Tasks: CV Optimization SaaS Application - MVP Local Version

**Input**: Design documents from `/specs/001-feature-name-cv/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/
**Focus**: MVP for local development only - core functionality without production concerns

## Execution Flow (MVP)
```
1. Load plan.md from feature directory
   → Extract: Python 3.11 + FastAPI, TypeScript + React, PostgreSQL
2. Load design documents:
   → data-model.md: 4 entities (User, CV, JobDescription, AISection)
   → contracts/openapi.yaml: Core API endpoints only
   → research.md: Technology stack decisions
   → quickstart.md: Essential user workflows
3. Generate MVP tasks:
   → Setup: Basic project structure, essential dependencies
   → Tests: Core contract tests, essential integration tests
   → Core: Essential models, services, API endpoints, frontend components
   → Integration: Basic DB, auth, file handling, AI integration
   → Polish: Essential unit tests, basic docs
4. Focus on local development:
   → Docker Compose for easy setup
   → SQLite for development (simpler than PostgreSQL)
   → Basic error handling
   → Essential security only
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- MVP focus: Essential functionality only

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`
- **Tests**: `backend/tests/`, `frontend/tests/`
- **Local dev**: SQLite database, Docker Compose

## Phase 3.1: MVP Setup
- [ ] T001 Create basic project structure (backend/, frontend/, docker-compose.yml)
- [ ] T002 Initialize Python backend with FastAPI and essential dependencies
- [ ] T003 Initialize React frontend with TypeScript and Vite
- [ ] T004 [P] Configure basic Python linting (black, flake8)
- [ ] T005 [P] Configure basic TypeScript linting (ESLint, Prettier)
- [ ] T006 Setup SQLite database for local development
- [ ] T007 Configure basic environment variables

## Phase 3.2: MVP Database Setup
- [ ] T008 Create basic database models (User, CV, JobDescription, AISection)
- [ ] T009 [P] Create User model in backend/src/models/user.py
- [ ] T010 [P] Create CV model in backend/src/models/cv.py
- [ ] T011 [P] Create JobDescription model in backend/src/models/job_description.py
- [ ] T012 [P] Create AISection model in backend/src/models/ai_section.py
- [ ] T013 Create database initialization script
- [ ] T014 Create basic seed data for development

## Phase 3.3: MVP Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Essential Contract Tests
- [ ] T015 [P] Contract test POST /auth/register in backend/tests/contract/test_auth_register.py
- [ ] T016 [P] Contract test POST /auth/login in backend/tests/contract/test_auth_login.py
- [ ] T017 [P] Contract test POST /api/cvs in backend/tests/contract/test_cvs_upload.py
- [ ] T018 [P] Contract test GET /api/cvs in backend/tests/contract/test_cvs_list.py
- [ ] T019 [P] Contract test PUT /api/cvs/{cv_id} in backend/tests/contract/test_cvs_update.py
- [ ] T020 [P] Contract test POST /api/cvs/{cv_id}/job-descriptions in backend/tests/contract/test_job_descriptions_create.py
- [ ] T021 [P] Contract test POST /api/cvs/{cv_id}/generate-section in backend/tests/contract/test_ai_generate.py

### Essential Integration Tests
- [ ] T022 [P] Integration test user registration flow in backend/tests/integration/test_user_registration.py
- [ ] T023 [P] Integration test CV upload and parsing flow in backend/tests/integration/test_cv_upload_flow.py
- [ ] T024 [P] Integration test AI section generation flow in backend/tests/integration/test_ai_generation_flow.py
- [ ] T025 [P] Frontend integration test authentication flow in frontend/tests/integration/test_auth_flow.test.tsx
- [ ] T026 [P] Frontend integration test CV upload flow in frontend/tests/integration/test_cv_upload.test.tsx

## Phase 3.4: MVP Core Implementation (ONLY after tests are failing)

### Essential Database Models
- [ ] T027 [P] User model implementation in backend/src/models/user.py
- [ ] T028 [P] CV model implementation in backend/src/models/cv.py
- [ ] T029 [P] JobDescription model implementation in backend/src/models/job_description.py
- [ ] T030 [P] AISection model implementation in backend/src/models/ai_section.py

### Essential Backend Services
- [ ] T031 [P] Basic authentication service in backend/src/services/auth_service.py
- [ ] T032 [P] CV service in backend/src/services/cv_service.py
- [ ] T033 [P] Basic file upload service in backend/src/services/file_service.py
- [ ] T034 [P] OpenAI integration service in backend/src/services/ai_service.py

### Essential Backend API Endpoints
- [ ] T035 Authentication endpoints in backend/src/api/auth.py
- [ ] T036 CV management endpoints in backend/src/api/cvs.py
- [ ] T037 Job description endpoints in backend/src/api/job_descriptions.py
- [ ] T038 AI generation endpoints in backend/src/api/ai.py
- [ ] T039 Main FastAPI application in backend/src/main.py

### Essential Frontend Core
- [ ] T040 [P] React app setup with TypeScript in frontend/src/App.tsx
- [ ] T041 [P] Basic routing in frontend/src/router/index.tsx
- [ ] T042 [P] Basic state management with Zustand in frontend/src/store/
- [ ] T043 [P] API service layer in frontend/src/services/api.ts
- [ ] T044 [P] Authentication context in frontend/src/contexts/AuthContext.tsx

### Essential Frontend Components
- [ ] T045 [P] Login/Register components in frontend/src/components/auth/
- [ ] T046 [P] CV upload component in frontend/src/components/cv/CVUpload.tsx
- [ ] T047 [P] Basic CV editor in frontend/src/components/cv/CVEditor.tsx
- [ ] T048 [P] Job description input component in frontend/src/components/job/JobDescriptionInput.tsx
- [ ] T049 [P] AI section display component in frontend/src/components/ai/AISection.tsx
- [ ] T050 [P] Basic dashboard in frontend/src/components/dashboard/Dashboard.tsx

### Essential Frontend Pages
- [ ] T051 [P] Home page in frontend/src/pages/Home.tsx
- [ ] T052 [P] Login page in frontend/src/pages/Login.tsx
- [ ] T053 [P] Register page in frontend/src/pages/Register.tsx
- [ ] T054 [P] CV editor page in frontend/src/pages/CVEditor.tsx

## Phase 3.5: MVP Integration

### Essential Backend Integration
- [ ] T055 Basic database connection
- [ ] T056 JWT authentication middleware
- [ ] T057 Basic file upload handling
- [ ] T058 CORS configuration
- [ ] T059 Basic error handling
- [ ] T060 OpenAI API integration

### Essential Frontend Integration
- [ ] T061 API client configuration
- [ ] T062 Authentication state management
- [ ] T063 File upload integration
- [ ] T064 Basic error handling
- [ ] T065 Auto-save functionality

### Essential Cross-Platform Integration
- [ ] T066 Frontend-backend API integration
- [ ] T067 Authentication flow integration
- [ ] T068 File upload flow integration
- [ ] T069 AI generation flow integration

## Phase 3.6: MVP Polish

### Essential Unit Tests
- [ ] T070 [P] Backend unit tests for models in backend/tests/unit/test_models.py
- [ ] T071 [P] Backend unit tests for services in backend/tests/unit/test_services.py
- [ ] T072 [P] Frontend unit tests for components in frontend/tests/unit/

### Essential Documentation
- [ ] T073 [P] Basic README with setup instructions
- [ ] T074 [P] Docker Compose configuration
- [ ] T075 [P] Basic API documentation
- [ ] T076 [P] Environment configuration guide

## Dependencies

### Critical Dependencies
- Tests (T015-T026) before implementation (T027-T054)
- Database models (T027-T030) before services (T031-T034)
- Services before API endpoints (T035-T039)
- Backend core before frontend integration (T055-T060)
- All implementation before polish (T070-T076)

### File Dependencies
- T027 blocks T031, T055 (User model needed for auth service and DB connection)
- T028 blocks T032, T055 (CV model needed for CV service and DB connection)
- T029 blocks T034, T055 (JobDescription model needed for AI service and DB connection)
- T030 blocks T034, T055 (AISection model needed for AI service and DB connection)
- T031 blocks T035 (Auth service needed for auth endpoints)
- T032 blocks T036 (CV service needed for CV endpoints)
- T034 blocks T038 (AI service needed for AI endpoints)

## Parallel Execution Groups

### Group 1: Contract Tests (T015-T021) - Can run in parallel
```
Task: "Contract test POST /auth/register in backend/tests/contract/test_auth_register.py"
Task: "Contract test POST /auth/login in backend/tests/contract/test_auth_login.py"
Task: "Contract test POST /api/cvs in backend/tests/contract/test_cvs_upload.py"
Task: "Contract test GET /api/cvs in backend/tests/contract/test_cvs_list.py"
Task: "Contract test PUT /api/cvs/{cv_id} in backend/tests/contract/test_cvs_update.py"
Task: "Contract test POST /api/cvs/{cv_id}/job-descriptions in backend/tests/contract/test_job_descriptions_create.py"
Task: "Contract test POST /api/cvs/{cv_id}/generate-section in backend/tests/contract/test_ai_generate.py"
```

### Group 2: Integration Tests (T022-T026) - Can run in parallel
```
Task: "Integration test user registration flow in backend/tests/integration/test_user_registration.py"
Task: "Integration test CV upload and parsing flow in backend/tests/integration/test_cv_upload_flow.py"
Task: "Integration test AI section generation flow in backend/tests/integration/test_ai_generation_flow.py"
Task: "Frontend integration test authentication flow in frontend/tests/integration/test_auth_flow.test.tsx"
Task: "Frontend integration test CV upload flow in frontend/tests/integration/test_cv_upload.test.tsx"
```

### Group 3: Database Models (T027-T030) - Can run in parallel
```
Task: "User model implementation in backend/src/models/user.py"
Task: "CV model implementation in backend/src/models/cv.py"
Task: "JobDescription model implementation in backend/src/models/job_description.py"
Task: "AISection model implementation in backend/src/models/ai_section.py"
```

### Group 4: Backend Services (T031-T034) - Can run in parallel
```
Task: "Basic authentication service in backend/src/services/auth_service.py"
Task: "CV service in backend/src/services/cv_service.py"
Task: "Basic file upload service in backend/src/services/file_service.py"
Task: "OpenAI integration service in backend/src/services/ai_service.py"
```

### Group 5: Frontend Components (T045-T050) - Can run in parallel
```
Task: "Login/Register components in frontend/src/components/auth/"
Task: "CV upload component in frontend/src/components/cv/CVUpload.tsx"
Task: "Basic CV editor in frontend/src/components/cv/CVEditor.tsx"
Task: "Job description input component in frontend/src/components/job/JobDescriptionInput.tsx"
Task: "AI section display component in frontend/src/components/ai/AISection.tsx"
Task: "Basic dashboard in frontend/src/components/dashboard/Dashboard.tsx"
```

## MVP Features Included

### Core Functionality
- ✅ User registration and login (email/password only)
- ✅ CV file upload (PDF, DOC, DOCX)
- ✅ Basic CV parsing with OpenAI
- ✅ CV editing with text modification
- ✅ Job description input
- ✅ AI section generation
- ✅ Basic dashboard

### MVP Exclusions (for later phases)
- ❌ Google OAuth (email/password only)
- ❌ Advanced drag-and-drop reordering
- ❌ Real-time collaboration
- ❌ Advanced security features
- ❌ Production deployment
- ❌ Performance optimization
- ❌ Advanced error handling
- ❌ Monitoring and logging
- ❌ CI/CD pipeline

## Local Development Setup

### Quick Start Commands
```bash
# 1. Setup
git clone <repo>
cd cv_lator
docker-compose up -d

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend
cd frontend
npm install
npm run dev

# 4. Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Environment Variables (MVP)
```bash
# Backend .env
DATABASE_URL=sqlite:///./cv_optimizer.db
JWT_SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-key-here
DEBUG=true

# Frontend .env
VITE_API_BASE_URL=http://localhost:8000
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Follow TDD: Red → Green → Refactor
- Use SQLite for local development (simpler than PostgreSQL)
- Focus on core functionality only
- Avoid: production concerns, advanced features, complex security

## Validation Checklist
*GATE: Checked before returning*

- [x] All essential contracts have corresponding tests (7 contract tests)
- [x] All entities have model tasks (4 entities)
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Core user workflows covered
- [x] Local development focused
- [x] MVP scope clearly defined

## Task Summary
- **Total Tasks**: 76 (vs 123 in full version)
- **Setup Tasks**: 7 (T001-T007)
- **Database Tasks**: 8 (T008-T014)
- **Test Tasks**: 12 (T015-T026) - All [P] parallel
- **Core Implementation**: 28 (T027-T054)
- **Integration Tasks**: 15 (T055-T069)
- **Polish Tasks**: 6 (T070-T076)
- **Parallel Groups**: 5 major groups identified
- **Critical Path**: Setup → Database → Tests → Models → Services → Endpoints → Integration → Polish
- **Focus**: Local development, core functionality, MVP scope