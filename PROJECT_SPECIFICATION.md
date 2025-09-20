# CV Lator - Comprehensive Project Specification

## Project Overview

CV Lator is a comprehensive AI-powered CV optimization SaaS platform that enables job seekers to upload, edit, and enhance their CVs using artificial intelligence. The platform provides CV parsing, interactive editing, version history tracking, and AI-generated content tailored to specific job descriptions.

## Architecture Overview

The application follows a modern full-stack architecture with:
- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Frontend**: React 18 with TypeScript and Material-UI
- **Database**: SQLite (development) / PostgreSQL (production)
- **AI Integration**: OpenAI GPT-4o-mini
- **Deployment**: Docker containerization with Docker Compose

## 1. Backend Specification

### 1.1 Technology Stack
- **Framework**: FastAPI 0.104.1
- **Python Version**: 3.11+
- **Database ORM**: SQLAlchemy 2.0.23
- **Authentication**: JWT with refresh tokens
- **File Processing**: PyPDF2, python-docx
- **AI Integration**: OpenAI 1.3.7
- **Testing**: pytest with asyncio support

### 1.2 Project Structure
```
backend/
├── main.py                     # FastAPI application entry point
├── requirements.txt            # Python dependencies
├── pyproject.toml             # Python project configuration
├── run_production.py          # Production server runner
├── Dockerfile                 # Backend container definition
├── uploads/                   # File storage directory
├── src/
│   ├── api/                   # API route handlers
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── cvs.py            # CV CRUD operations
│   │   ├── job_descriptions.py # Job description management
│   │   ├── ai.py             # AI content generation
│   │   └── cv_history.py     # Version history management
│   ├── models/               # Database models
│   │   ├── base.py          # Base model and database session
│   │   ├── user.py          # User authentication model
│   │   ├── cv.py            # CV document model
│   │   ├── job_description.py # Job posting model
│   │   ├── ai_section.py    # AI-generated content model
│   │   └── cv_history.py    # Version history model
│   ├── services/            # Business logic layer
│   │   ├── auth_service.py  # Authentication logic
│   │   ├── cv_service.py    # CV management logic
│   │   ├── cv_parsing_service.py # CV parsing logic
│   │   ├── ai_service.py    # AI content generation
│   │   └── file_service.py  # File handling utilities
│   ├── schemas/             # Pydantic schemas
│   │   └── cv_schemas.py    # CV data validation schemas
│   ├── utils/               # Utility functions
│   │   └── validation.py    # Data validation utilities
│   ├── constants.py         # Application constants
│   └── database.py          # Database configuration
├── tests/                   # Test suite
│   ├── unit/               # Unit tests
│   └── test_helpers.py     # Test utilities
└── venv/                   # Python virtual environment
```

### 1.3 Database Schema

#### User Model (`users` table)
```python
class User(Base):
    id: str (UUID, Primary Key)
    email: str (Unique, Indexed)
    password_hash: str (Nullable for OAuth)
    google_id: str (Nullable, Unique, Indexed)
    is_active: bool (Default: True)
    email_verified: bool (Default: False)
    created_at: datetime (Auto-generated)
    updated_at: datetime (Auto-updated)
    last_login: datetime (Nullable)
```

#### CV Model (`cvs` table)
```python
class CV(Base):
    id: str (UUID, Primary Key)
    user_id: str (Foreign Key to users.id)
    original_filename: str
    file_path: str
    file_size: int
    file_type: str
    parsed_data: JSON (Nullable)
    is_parsed: bool (Default: False)
    parse_error: str (Nullable)
    created_at: datetime (Auto-generated)
    updated_at: datetime (Auto-updated)
```

#### Job Description Model (`job_descriptions` table)
```python
class JobDescription(Base):
    id: str (UUID, Primary Key)
    cv_id: str (Foreign Key to cvs.id, Nullable)
    content: str (Nullable)
    description: str (Nullable)
    requirements: JSON (Nullable)
    salary_range: str (Nullable)
    employment_type: str (Nullable)
    source_url: str (Nullable)
    title: str (Nullable)
    company: str (Nullable)
    location: str (Nullable)
    created_at: datetime (Auto-generated)
    updated_at: datetime (Auto-updated)
```

#### AI Section Model (`ai_sections` table)
```python
class AISection(Base):
    id: str (UUID, Primary Key)
    cv_id: str (Foreign Key to cvs.id)
    job_description_id: str (Foreign Key to job_descriptions.id, Nullable)
    section_content: str (Nullable)
    suggestions: JSON (Nullable)
    optimized_data: JSON (Nullable)
    section_type: str (Default: "why_good_fit")
    generation_prompt: str (Nullable)
    ai_model: str (Default: "gpt-4o-mini")
    tokens_used: int (Nullable)
    generation_time: int (Nullable)
    is_active: bool (Default: True)
    created_at: datetime (Auto-generated)
    updated_at: datetime (Auto-updated)
```

#### CV History Model (`cv_history` table)
```python
class CVHistory(Base):
    id: str (UUID, Primary Key)
    cv_id: str (Foreign Key to cvs.id)
    user_id: str (Foreign Key to users.id)
    cv_data: JSON (Required)
    change_type: str (Required)
    description: str (Nullable)
    label: str (Nullable)
    is_automatic: bool (Default: True)
    is_initial: bool (Default: False)
    data_size: int (Required)
    created_at: datetime (Auto-generated)
```

### 1.4 API Endpoints

#### Authentication (`/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

#### CV Management (`/api/cvs`)
- `POST /api/cvs/` - Upload CV file
- `GET /api/cvs/` - List user's CVs (paginated)
- `GET /api/cvs/{cv_id}` - Get specific CV
- `PUT /api/cvs/{cv_id}` - Update CV data
- `DELETE /api/cvs/{cv_id}` - Delete CV
- `POST /api/cvs/create-blank` - Create blank CV
- `PUT /api/cvs/{cv_id}/title` - Update CV title
- `GET /api/cvs/{cv_id}/download` - Download original file

#### CV History (`/api/cvs/{cv_id}`)
- `POST /api/cvs/{cv_id}/history` - Create history snapshot
- `GET /api/cvs/{cv_id}/history` - Get history entries
- `GET /api/cvs/{cv_id}/history/{entry_id}` - Get specific history entry
- `DELETE /api/cvs/{cv_id}/history/{entry_id}` - Delete history entry
- `DELETE /api/cvs/{cv_id}/history` - Clear all history
- `GET /api/cvs/{cv_id}/history-stats` - Get history statistics
- `POST /api/cvs/{cv_id}/restore/{entry_id}` - Restore to previous version

#### Job Descriptions (`/api/cvs/{cv_id}/job-descriptions`)
- `POST /api/cvs/{cv_id}/job-descriptions` - Add job description
- `GET /api/cvs/{cv_id}/job-descriptions` - Get job descriptions
- `DELETE /api/job-descriptions/{jd_id}` - Delete job description

#### AI Features (`/api/cvs/{cv_id}`)
- `POST /api/cvs/{cv_id}/generate-section` - Generate AI section
- `GET /api/cvs/{cv_id}/ai-sections` - Get AI-generated sections

### 1.5 Core Services

#### CV Parsing Service
- Extracts text from PDF, DOC, and DOCX files
- Uses OpenAI GPT-4o-mini for intelligent parsing
- Maps content to predefined CV sections
- Adds UUIDs to array items for frontend consistency
- Handles parsing errors gracefully

#### AI Service
- Generates tailored CV sections based on job descriptions
- Creates "Why I'm a Good Fit" sections
- Tracks token usage and generation time
- Provides fallback responses on API errors

#### File Service
- Validates uploaded files (type, size)
- Handles secure file storage
- Extracts text from multiple formats
- Manages file cleanup on deletion

### 1.6 Security Features
- JWT-based authentication with refresh tokens
- Password hashing using bcrypt
- File type and size validation
- CORS configuration
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS protection

## 2. Frontend Specification

### 2.1 Technology Stack
- **Framework**: React 18.2.0
- **Language**: TypeScript 5.2.2
- **UI Library**: Material-UI 5.15.0
- **State Management**: Zustand 4.4.7
- **Routing**: React Router DOM 6.20.1
- **HTTP Client**: Axios 1.6.2
- **Build Tool**: Vite 5.0.8
- **Testing**: Jest 29.7.0, Playwright 1.55.0

### 2.2 Project Structure
```
frontend/
├── public/                   # Static assets
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   ├── components/          # Reusable components
│   │   ├── common/          # Shared components
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── NotificationProvider.tsx
│   │   └── cv/              # CV-specific components
│   │       ├── PDFCVEditor.tsx
│   │       ├── CVDiffViewer.tsx
│   │       ├── HistoryPanel.tsx
│   │       ├── ConnectedHistoryPanel.tsx
│   │       ├── VersionPreviewDialog.tsx
│   │       ├── core/        # Core CV editing components
│   │       │   ├── CVContentArea.tsx
│   │       │   ├── IndividualItemSection.tsx
│   │       │   ├── SectionManagerSidebar.tsx
│   │       │   └── editable-collection/
│   │       │       └── hooks.ts
│   │       └── sections/    # CV section components
│   │           ├── AwardsSection.tsx
│   │           ├── CertificationsSection.tsx
│   │           ├── EducationSection.tsx
│   │           ├── ProjectsSection.tsx
│   │           ├── PublicationsSection.tsx
│   │           ├── VolunteerExperienceSection.tsx
│   │           └── WorkExperienceSection.tsx
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── CVEditorContext.tsx
│   │   └── index.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useCVEditor.ts
│   │   └── useNotifications.ts
│   ├── pages/               # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   └── CVEditor.tsx
│   ├── services/            # API services
│   │   ├── api.ts          # HTTP client configuration
│   │   ├── authService.ts  # Authentication API
│   │   ├── cvService.ts    # CV management API
│   │   ├── cvValidationService.ts # CV validation
│   │   ├── backendHistoryService.ts # History API
│   │   └── historyService.ts # History management
│   ├── stores/              # Zustand stores
│   │   ├── cvStore.ts      # CV state management
│   │   ├── authStore.ts    # Authentication state
│   │   └── uiStore.ts      # UI state management
│   ├── types/               # TypeScript definitions
│   │   ├── cv.ts           # CV data types
│   │   ├── auth.ts         # Authentication types
│   │   ├── history.ts      # History types
│   │   └── index.ts        # Type exports
│   ├── utils/               # Utility functions
│   │   ├── cvDataMigration.ts
│   │   ├── dateFormat.ts
│   │   ├── historyRetention.ts
│   │   ├── idGenerator.ts
│   │   └── validation.ts
│   └── test-utils/          # Testing utilities
├── tests/                   # Test files
│   └── e2e/                # End-to-end tests
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
├── jest.config.mjs         # Jest configuration
├── playwright.config.ts    # Playwright configuration
└── Dockerfile              # Frontend container definition
```

### 2.3 Core Data Types

#### CV Data Structure
```typescript
interface CVData {
  personal_info: PersonalInfo
  professional_summary: ProfessionalSummary
  work_experience: WorkExperience[]
  education: Education[]
  skills: Skills
  certifications: Certification[]
  projects: Project[]
  awards: Award[]
  publications: Publication[]
  volunteer_experience: VolunteerExperience[]
  section_config?: SectionConfig
}

interface PersonalInfo {
  full_name: string
  email: string
  phone: string
  location: string
  linkedin_url: string
  website_url: string
  github_url?: string
  portfolio_url?: string
}

interface WorkExperience {
  id: string
  company: string
  position: string
  location: string
  start_date: string
  end_date: string
  current: boolean
  description: string
  achievements: string[]
  technologies: string[]
  responsibilities?: string[]
}
```

### 2.4 Key Features

#### CV Editor
- Interactive drag-and-drop reordering
- Inline editing with auto-save
- Real-time preview
- Section visibility toggles
- Form validation with error handling

#### Version History
- Automatic snapshots on significant changes
- Manual snapshot creation
- Visual diff viewer
- One-click version restoration
- History statistics and cleanup

#### AI Integration
- Job description parsing
- Tailored content generation
- "Why I'm a Good Fit" sections
- Performance tracking

### 2.5 State Management

#### CV Store (Zustand)
- Centralized CV state management
- Background parsing status polling
- CRUD operations with optimistic updates
- History management integration
- Error handling and loading states

#### Authentication Store
- JWT token management
- Automatic token refresh
- Login/logout state
- User profile data

#### UI Store
- Notification system
- Modal states
- Loading indicators
- Theme preferences

## 3. Database Schema Details

### 3.1 Relationships
- **Users** → **CVs** (One-to-Many)
- **CVs** → **Job Descriptions** (One-to-Many)
- **CVs** → **AI Sections** (One-to-Many)
- **CVs** → **CV History** (One-to-Many)
- **Job Descriptions** → **AI Sections** (One-to-Many)

### 3.2 Indexes
- `users.email` (Unique)
- `users.google_id` (Unique)
- `cvs.user_id` (Foreign Key)
- `job_descriptions.cv_id` (Foreign Key)
- `ai_sections.cv_id` (Foreign Key)
- `ai_sections.job_description_id` (Foreign Key)
- `cv_history.cv_id` (Foreign Key)
- `cv_history.user_id` (Foreign Key)

### 3.3 Constraints
- Cascade delete on CV deletion
- Non-null constraints on required fields
- Check constraints for data validation
- Unique constraints on email and Google ID

## 4. AI Integration

### 4.1 OpenAI Configuration
- **Model**: GPT-4o-mini
- **Max Tokens**: 500 (content generation), 2000 (parsing)
- **Temperature**: 0.7 (generation), 0.1 (parsing)
- **Rate Limiting**: Built-in error handling

### 4.2 CV Parsing
- Intelligent text extraction from PDF, DOC, DOCX
- Structured mapping to predefined sections
- Error handling with fallback responses
- UUID generation for array items

### 4.3 Content Generation
- Job description analysis
- Tailored section generation
- Performance metrics tracking
- Fallback error responses

## 5. File Handling

### 5.1 Supported Formats
- **PDF**: PyPDF2 extraction
- **DOC**: python-docx extraction
- **DOCX**: python-docx extraction

### 5.2 File Validation
- **Size Limit**: 10MB maximum
- **Type Validation**: MIME type checking
- **Security**: File extension validation

### 5.3 Storage
- Local filesystem storage
- Organized by UUID filenames
- Automatic cleanup on deletion

## 6. Authentication & Security

### 6.1 JWT Implementation
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- **Algorithm**: HS256
- **Automatic Refresh**: Frontend interceptor

### 6.2 Password Security
- **Hashing**: bcrypt with salt
- **Validation**: Minimum requirements
- **Storage**: Hashed only, never plaintext

### 6.3 API Security
- **CORS**: Configurable origins
- **Rate Limiting**: SlowAPI integration
- **Input Validation**: Pydantic schemas
- **SQL Injection**: ORM protection

## 7. Testing Strategy

### 7.1 Backend Testing
- **Unit Tests**: pytest with asyncio
- **Coverage**: 90%+ target
- **Test Database**: In-memory SQLite
- **Mocking**: OpenAI API responses

### 7.2 Frontend Testing
- **Unit Tests**: Jest with React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: 85%+ target
- **Test Data**: Mock API responses

### 7.3 Test Structure
```
tests/
├── unit/                    # Unit tests
│   ├── test_auth_service.py
│   ├── test_cv_service.py
│   ├── test_ai_service.py
│   ├── test_file_service.py
│   └── test_models.py
├── integration/             # Integration tests
└── e2e/                    # End-to-end tests
```

## 8. Deployment Configuration

### 8.1 Docker Configuration

#### Development (`docker-compose.yml`)
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=sqlite:///./cv_optimizer.db
      - JWT_SECRET_KEY=your-secret-key-here
      - OPENAI_API_KEY=your-openai-key-here
    volumes:
      - ./backend:/app
      - ./uploads:/app/uploads
    command: uvicorn main:app --reload

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
    command: npm run dev
```

#### Production (`docker-compose.prod.yml`)
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173
    volumes:
      - ./backend/uploads:/app/uploads
    restart: unless-stopped
    command: python run_production.py

  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [backend]
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on: [frontend, backend]
    restart: unless-stopped
```

### 8.2 Container Definitions

#### Backend Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Production Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 9. Environment Configuration

### 9.1 Backend Environment Variables
```env
# Database Configuration
DATABASE_URL=sqlite:///./cv_optimizer.db

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OpenAI Configuration
OPENAI_API_KEY=your-openai-key-here

# Application Configuration
DEBUG=true
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 9.2 Frontend Environment Variables
```env
VITE_API_BASE_URL=http://localhost:8000
```

## 10. Performance Specifications

### 10.1 Response Times
- **API Response**: < 200ms (95th percentile)
- **File Upload**: < 5 seconds for 10MB files
- **AI Generation**: < 30 seconds
- **Page Load**: < 2 seconds

### 10.2 Scalability
- **Concurrent Users**: 1000+
- **File Storage**: Local filesystem with cleanup
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Caching**: Browser caching for static assets

### 10.3 Optimization Features
- **Code Splitting**: Lazy loading of pages
- **Compression**: Gzip middleware
- **Static Assets**: CDN-ready build output
- **Database**: Indexed queries, optimized relationships

## 11. Error Handling & Logging

### 11.1 Backend Error Handling
- **Validation Errors**: Pydantic schema validation
- **Authentication Errors**: JWT validation
- **File Processing Errors**: Graceful fallbacks
- **AI API Errors**: Retry logic with fallbacks

### 11.2 Frontend Error Handling
- **Error Boundaries**: React error boundaries
- **API Errors**: Normalized error messages
- **Network Errors**: Retry mechanisms
- **Validation Errors**: Real-time form validation

### 11.3 Logging Strategy
- **Development**: Console logging with debug info
- **Production**: Structured logging
- **Error Tracking**: Exception capture
- **Performance**: Request timing logs

## 12. Monitoring & Maintenance

### 12.1 Health Checks
- **Backend**: `/health` endpoint
- **Frontend**: Application status monitoring
- **Database**: Connection health checks
- **AI Service**: OpenAI API status

### 12.2 Maintenance Tasks
- **File Cleanup**: Orphaned file removal
- **History Cleanup**: Old snapshot deletion
- **Database Optimization**: Index maintenance
- **Log Rotation**: Log file management

## 13. Development Workflow

### 13.1 Setup Instructions
```bash
# Clone repository
git clone <repository-url>
cd cv_lator

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
python src/database.py
uvicorn main:app --reload

# Frontend setup
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 13.2 Testing Commands
```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests
cd frontend
npm test
npm run test:e2e
```

### 13.3 Build Commands
```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d --build
```

## 14. Future Enhancements

### 14.1 Planned Features
- Multiple CV templates
- PDF export functionality
- CV analytics and insights
- Team collaboration features
- Advanced AI customization
- Multi-language support

### 14.2 Performance Improvements
- Redis caching layer
- Message queue for AI processing
- CDN for static assets
- Database optimization
- Microservices architecture

### 14.3 Scalability Considerations
- Horizontal scaling with load balancers
- Database sharding strategies
- File storage migration to cloud
- API rate limiting improvements
- Background job processing

## 15. Security Considerations

### 15.1 Data Protection
- **Personal Data**: Encrypted storage
- **File Security**: Access control
- **API Security**: Rate limiting
- **Authentication**: Secure token handling

### 15.2 Compliance
- **GDPR**: Data deletion capabilities
- **Privacy**: User data minimization
- **Security**: Regular security audits
- **Backup**: Automated backup strategies

This specification provides a comprehensive blueprint for recreating the CV Lator project with all its features, architecture, and implementation details.
