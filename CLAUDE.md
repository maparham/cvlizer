# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CV Optimizer is a full-stack AI-powered CV enhancement SaaS application built with FastAPI (backend) and React/TypeScript (frontend). The application allows users to upload CVs, parse them with AI, add job descriptions, and generate tailored content sections using OpenAI GPT-4o-mini.

**Tech Stack:**
- **Backend**: FastAPI, SQLAlchemy ORM, SQLite/PostgreSQL, OpenAI integration
- **Frontend**: React 18, TypeScript, Material-UI, Zustand state management
- **Auth**: Clerk with JWT tokens
- **Testing**: Pytest (backend), Jest (frontend), Playwright (E2E)

## Development Commands

### Backend Commands
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python src/database.py

# Run development server (hot-reload enabled)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
python tests/run_tests.py

# Run specific test module
python -m pytest tests/unit/test_models.py -v

# Run specific test
python -m pytest tests/unit/test_models.py::TestJobDescriptionModel -v

# Run tests with coverage
python -m pytest --cov=src tests/

# Type checking (if mypy is installed)
mypy src/
```

### Frontend Commands
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server (hot-reload enabled)
npm run dev

# Build for production
npm run build

# Build without TypeScript checks
npm run build:no-ts

# Run linter
npm run lint

# Run all tests
npm test

# Run tests with coverage
npm test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### Docker Commands
```bash
# Start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop all services
docker-compose down
```

## Architecture Overview

### Backend Architecture

The backend follows a **layered architecture** with clear separation of concerns:

```
Request ’ Middleware (auth, CORS) ’ API Routes ’ Service Layer ’ Database ’ Response
```

**Key Architectural Patterns:**

1. **API Layer** ([backend/src/api/](backend/src/api/)): FastAPI routers with dependency injection
   - Always use `get_effective_user` dependency for authentication (handles both real and impersonated users)
   - Validate user ownership before accessing resources
   - Delegate business logic to service layer

2. **Service Layer** ([backend/src/services/](backend/src/services/)): Business logic separated from endpoints
   - Stateless pure functions with dependency injection
   - All database operations go through services
   - Return typed objects, not raw queries

3. **Model Layer** ([backend/src/models/](backend/src/models/)): SQLAlchemy ORM models
   - All models inherit from Base in [base.py](backend/src/models/base.py)
   - UUID primary keys, timestamps on all models
   - Foreign keys with CASCADE deletes
   - Use `joinedload` for eager loading relationships

4. **Background Tasks** ([backend/src/utils/background_tasks.py](backend/src/utils/background_tasks.py)):
   - ThreadPoolExecutor for CPU-intensive AI operations
   - Each background task creates its own database session using `SessionLocal()`
   - Always close sessions in finally blocks
   - Update task status in database (pending ’ processing ’ completed/failed)

5. **AI Integration** ([backend/src/services/ai_service.py](backend/src/services/ai_service.py)):
   - All OpenAI calls go through ai_service
   - Retry logic with exponential backoff (max 3 retries)
   - Usage logging with [ai_usage_service.py](backend/src/services/ai_usage_service.py)
   - Check `is_ai_enabled()` before operations

**Authentication Flow:**
- Clerk JWT tokens are verified via [clerk_auth.py](backend/src/middleware/clerk_auth.py)
- User synced to local database on first request
- `get_effective_user` dependency handles both normal auth and impersonation
- All user-owned resources MUST filter by `user_id`

### Frontend Architecture

The frontend follows a **unidirectional data flow** pattern:

```
User Action ’ Component ’ Custom Hook ’ Zustand Store ’ API Service ’ Backend
                                             “
                                Response ’ Store Update ’ Component Re-render
```

**Key Architectural Patterns:**

1. **Component Structure** ([frontend/src/components/](frontend/src/components/)):
   - Organized by feature: `cv/`, `admin/`, etc.
   - Sub-organized by purpose: `cv/ai/`, `cv/core/`, `cv/sections/`
   - Functional components with TypeScript interfaces
   - Single Responsibility Principle

2. **State Management** ([frontend/src/stores/](frontend/src/stores/)):
   - Zustand stores for global state (not Context API)
   - Stores: `aiStore`, `cvStore`, `authStore`, `uiStore`, `aiSuggestionsStore`
   - Use selectors to prevent unnecessary re-renders: `useStore(state => state.data)`
   - Custom hooks abstract complex state logic

3. **API Services** ([frontend/src/services/](frontend/src/services/)):
   - All API calls go through service layer (never directly in components)
   - Axios-based with global error handling via interceptors
   - TypeScript interfaces for all request/response types
   - Services: `aiService`, `cvValidationService`, `backendHistoryService`, `adminAIUsageService`

4. **Custom Hooks** ([frontend/src/hooks/](frontend/src/hooks/)):
   - Reusable logic and side effects
   - Examples: `useInlineDrafts`, `useSectionManagement`, `useAITaskPolling`, `useJobDescriptionPolling`
   - Keep components clean and focused

5. **Background Task Polling**:
   - [AITaskPollingContext](frontend/src/contexts/AITaskPollingContext.tsx) polls for background task completion
   - [backgroundTaskPoller.ts](frontend/src/utils/backgroundTaskPoller.ts) utility for polling logic
   - Updates store when tasks complete

## Critical Patterns and Conventions

### Backend Patterns

**API Endpoint Template:**
```python
from src.middleware.clerk_auth import get_effective_user
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.models.base import get_db

@router.post("/endpoint")
async def create_resource(
    data: ResourceCreateSchema,
    user: User = Depends(get_effective_user),  # Handles impersonation
    db: Session = Depends(get_db)
) -> ResourceResponse:
    """Always document what the endpoint does."""

    # Validate user ownership if accessing existing resource
    existing = db.query(Resource).filter_by(id=data.id, user_id=user.id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")

    # Call service layer for business logic
    result = resource_service.create(db, user.id, data)

    return ResourceResponse.from_orm(result)
```

**Background Task Pattern:**
```python
def background_ai_task(task_id: str, user_id: str, data: dict):
    """Process AI task in background thread."""
    db = SessionLocal()  # Create new session in background thread
    try:
        # Update task status to processing
        task = db.query(Task).filter_by(id=task_id).first()
        task.status = "processing"
        db.commit()

        # Perform AI operation
        result = ai_service.perform_operation(data)

        # Update with result
        task.status = "completed"
        task.result = result
        db.commit()

    except Exception as e:
        task.status = "failed"
        task.error = str(e)
        db.commit()
        raise
    finally:
        db.close()  # CRITICAL: Always close session
```

**Service Layer Pattern:**
```python
def create_resource(db: Session, user_id: str, data: dict) -> Resource:
    """
    Create a new resource for a user.

    Args:
        db: Database session
        user_id: User ID (already authenticated)
        data: Validated data

    Returns:
        Resource: Created resource object
    """
    resource = Resource(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **data
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource
```

### Frontend Patterns

**Component Template:**
```typescript
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useStore } from '../../stores/store';

interface ComponentProps {
  prop1: string;
  prop2: number;
  onAction?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2, onAction }) => {
  // Use selectors to prevent unnecessary re-renders
  const data = useStore(state => state.data);

  // Memoize expensive calculations
  const processed = useMemo(() => expensiveOp(data), [data]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">{prop1}</Typography>
      {/* Content */}
    </Box>
  );
};
```

**Custom Hook Pattern:**
```typescript
export const useCustomHook = (cvId: string) => {
  const store = useStore();

  const fetchData = useCallback(async () => {
    try {
      const data = await apiService.fetchData(cvId);
      store.setData(data);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [cvId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data: store.data, refetch: fetchData };
};
```

**API Service Pattern:**
```typescript
import api from './api';
import type { Response } from '../types';

export const resourceService = {
  async getResource(id: string): Promise<Response> {
    const response = await api.get(`/api/resources/${id}`);
    return response.data;
  },

  async createResource(data: CreateData): Promise<Response> {
    const response = await api.post('/api/resources', data);
    return response.data;
  }
};
```

## Database Models

Key models and their relationships:

- **User**: Authentication and user management (Clerk-synced)
- **CV**: Uploaded CV files and parsed data (belongs to User)
- **JobDescription**: Job requirements for CV tailoring (belongs to CV/User)
- **AISection**: AI-generated content sections (belongs to CV)
- **AIDraft**: AI draft suggestions for sections (belongs to User)
- **AIEnhancement**: AI enhancement suggestions (belongs to CV)
- **ContentEnhancement**: Enhanced content (belongs to CV)
- **CVHistory**: Version tracking for CVs (belongs to CV)
- **AIUsageLog**: AI operation usage and cost tracking (belongs to User)
- **UserActivity**: User action tracking (belongs to User)
- **ImpersonationSession**: Admin impersonation sessions (belongs to User)
- **AuditLog**: System audit trail

## Testing Guidelines

### Backend Testing

**Test Coverage Target**: 80%+ for MVP

**Test Organization:**
- Unit tests: [backend/tests/unit/](backend/tests/unit/)
- Integration tests: [backend/tests/integration/](backend/tests/integration/)
- Use FastAPI TestClient for endpoint tests
- Mock external dependencies (OpenAI, Clerk API)

**Run specific tests:**
```bash
# Single test file
python -m pytest tests/unit/test_models.py -v

# Single test class
python -m pytest tests/unit/test_models.py::TestJobDescriptionModel -v

# Single test method
python -m pytest tests/unit/test_models.py::TestJobDescriptionModel::test_create_job_description -v
```

### Frontend Testing

**Test Coverage Target**: 70%+ for MVP

**Test Organization:**
- Component tests: [frontend/src/__tests__/components/](frontend/src/__tests__/components/)
- Integration tests: [frontend/src/__tests__/integration/](frontend/src/__tests__/integration/)
- E2E tests: Use Playwright (npm run test:e2e)
- Use React Testing Library for component tests
- Mock API calls and external dependencies

## Important Development Rules

### Server Management
**NEVER start, stop, or restart servers** unless explicitly requested by user. Both frontend and backend have hot-reload enabled and will automatically reload on file changes.

### Authentication
- **ALWAYS** use `get_effective_user` dependency (not `get_current_user`)
- This handles both normal authentication and admin impersonation
- **ALWAYS** filter queries by `user_id` for user-owned resources

### Code Quality
- **Backend**: Follow PEP 8, use Black formatter (88 chars), add type hints
- **Frontend**: TypeScript strict mode, avoid `any` type, use ESLint
- Write docstrings for all public functions and classes
- Keep functions focused (Single Responsibility Principle)

### Security
- Validate all inputs with Pydantic schemas (backend) or TypeScript types (frontend)
- Sanitize user inputs before AI processing
- Never expose API keys to frontend
- Use HTTPS only in production
- Generic error messages for users, detailed logs server-side

### State Management
- Use Zustand stores for global state (not Context API for data)
- Use selectors to prevent unnecessary re-renders
- Extract complex logic into custom hooks
- API calls through service layer only

### Background Tasks
- Use ThreadPoolExecutor for CPU-intensive operations
- Create new database session in background threads: `SessionLocal()`
- Always close sessions in finally blocks
- Update task status: pending ’ processing ’ completed/failed
- Frontend polls for completion using polling contexts

## Environment Variables

### Backend Required Variables
- `DATABASE_URL`: Database connection string
- `JWT_SECRET_KEY`: Secret for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key
- `CLERK_SECRET_KEY`: Clerk API secret key
- `CLERK_JWKS_URL`: Clerk JWKS URL for token verification
- `CLERK_ISSUER`: Clerk issuer URL
- `CLERK_AUDIENCE`: Clerk audience (optional)

### Backend Optional Variables
- `DEV_MODE`: Enable development mode (default: true)
- `CLERK_VERIFY_TOKENS`: Verify Clerk JWT tokens (default: true)
- `DEBUG`: Enable debug logging
- `ADMIN_EMAIL`: Admin user email for admin privileges
- `BACKGROUND_TASK_WORKERS`: Number of background task workers (default: 3)
- `CV_PARSE_WORKERS`: Number of CV parsing workers (default: 2)
- `MAX_FILE_SIZE`: Max upload size in bytes (default: 10485760)
- `CORS_ALLOW_ORIGINS`: Comma-separated CORS origins

### Frontend Required Variables
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8000)

## API Documentation

When backend is running, access interactive API documentation at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Key Files Reference

### Backend Entry Points
- [main.py](backend/main.py) - FastAPI application entry point
- [database.py](backend/src/database.py) - Database configuration and initialization

### Frontend Entry Points
- [main.tsx](frontend/src/main.tsx) - React application entry point
- [App.tsx](frontend/src/App.tsx) - Main application component with routing

### Key Backend Services
- [ai_service.py](backend/src/services/ai_service.py) - OpenAI integration and AI operations
- [ai_usage_service.py](backend/src/services/ai_usage_service.py) - AI usage tracking and analytics
- [job_description_service.py](backend/src/services/job_description_service.py) - Job description parsing and management
- [file_service.py](backend/src/services/file_service.py) - File upload and validation
- [auth_service.py](backend/src/services/auth_service.py) - JWT token handling

### Key Frontend Stores
- [aiStore.ts](frontend/src/stores/aiStore.ts) - AI operations, drafts, and suggestions state
- [cvStore.ts](frontend/src/stores/cvStore.ts) - CV data and editing state
- [authStore.ts](frontend/src/stores/authStore.ts) - Authentication state
- [aiSuggestionsStore.ts](frontend/src/stores/aiSuggestionsStore.ts) - AI suggestions state

### Key Frontend Contexts
- [AITaskPollingContext.tsx](frontend/src/contexts/AITaskPollingContext.tsx) - Background task polling
- [AuthContext.tsx](frontend/src/contexts/AuthContext.tsx) - Clerk authentication
- [ImpersonationContext.tsx](frontend/src/contexts/ImpersonationContext.tsx) - Admin impersonation

## Cursor Rules Integration

This project has extensive Cursor rules in [.cursor/rules/](.cursor/rules/). Key rules to follow:

1. **Project Structure** - Architecture and organization patterns
2. **Backend Patterns** - FastAPI, SQLAlchemy, Python conventions
3. **Frontend Patterns** - React, TypeScript, Material-UI conventions
4. **AI Integration** - OpenAI service patterns and best practices
5. **Security Patterns** - Authentication and data protection
6. **Testing Patterns** - Test organization and coverage targets
7. **Development Guidelines** - MVP focus and deferred optimizations

See [.cursor/QUICK_REFERENCE.md](.cursor/QUICK_REFERENCE.md) for quick pattern lookups.

## Common Workflows

### Adding a New API Endpoint

1. Create Pydantic schema in [backend/src/schemas/](backend/src/schemas/)
2. Add service function in [backend/src/services/](backend/src/services/)
3. Create route in appropriate router in [backend/src/api/](backend/src/api/)
4. Add tests in [backend/tests/](backend/tests/)
5. Create TypeScript types in [frontend/src/types/](frontend/src/types/)
6. Add service method in [frontend/src/services/](frontend/src/services/)
7. Update Zustand store if needed in [frontend/src/stores/](frontend/src/stores/)

### Adding a New Component

1. Create component in appropriate directory under [frontend/src/components/](frontend/src/components/)
2. Define TypeScript interface for props
3. Use Material-UI components for consistency
4. Extract complex logic into custom hooks
5. Add tests in [frontend/src/__tests__/](frontend/src/__tests__/)
6. Update index.ts for exports if needed

### Adding a Background AI Task

1. Create task model in [backend/src/models/](backend/src/models/) with status tracking
2. Add processing function following background task pattern
3. Use `run_task_in_background` from [background_tasks.py](backend/src/utils/background_tasks.py)
4. Add polling hook in frontend (see [useAITaskPolling.ts](frontend/src/hooks/useAITaskPolling.ts))
5. Update UI to show task status
6. Log AI usage with ai_usage_service

## Performance Considerations

- **Backend**: Use `joinedload` for eager loading to avoid N+1 queries
- **Frontend**: Use React.memo, useMemo, useCallback for expensive operations
- **Frontend**: Zustand selectors prevent unnecessary re-renders
- **Background Tasks**: Offload CPU-intensive operations to ThreadPoolExecutor
- **Caching**: Clerk user info cached for 5 minutes to reduce API calls
- **Code Splitting**: Use dynamic imports for route-based code splitting