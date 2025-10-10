# CV Lator Backend Specification

## Overview

The CV Lator backend is a FastAPI-based REST API service that provides comprehensive CV management, AI-powered content generation, and user authentication capabilities. It serves as the core backend for an AI-powered CV optimization SaaS platform.

## Architecture

### Technology Stack
- **Framework**: FastAPI 0.104.1
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy 2.0.23 with Alembic 1.12.1 for migrations
- **Authentication**: Clerk JWT token verification with JWKS support (primary), legacy JWT with python-jose 3.3.0
- **AI Integration**: OpenAI >=1.68.0 (GPT-4o-mini for CV parsing and content generation)
- **File Processing**: PyMuPDF 1.26.4, python-docx 1.1.0
- **Web Scraping**: Selenium 4.15.0 for JavaScript-heavy job sites, requests 2.31.0, beautifulsoup4 4.12.2
- **Background Processing**: ThreadPoolExecutor for CPU-intensive operations
- **PDF Export**: LaTeX compilation for professional CV formatting
- **Testing**: pytest 7.4.3 with comprehensive coverage, httpx 0.25.2 for async tests
- **Deployment**: Docker with production-ready configuration

### Project Structure
```
backend/
├── src/
│   ├── api/                    # API endpoint modules
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── cvs.py             # CV management endpoints
│   │   ├── job_descriptions.py # Job description management
│   │   ├── ai.py              # AI-powered features
│   │   ├── cv_history.py      # CV version history
│   │   ├── admin.py           # Admin functionality
│   │   ├── user_activities.py # User activity tracking
│   │   └── impersonation.py   # Admin impersonation
│   ├── models/                 # Database models
│   │   ├── base.py            # Database configuration
│   │   ├── user.py            # User model
│   │   ├── cv.py              # CV model
│   │   ├── job_description.py # Job description model
│   │   ├── ai_section.py      # AI-generated content model
│   │   ├── cv_history.py      # CV version history model
│   │   ├── audit_log.py       # Audit logging model
│   │   └── impersonation_session.py # Admin impersonation model
│   ├── services/              # Business logic services
│   │   ├── auth_service.py    # Authentication logic
│   │   ├── cv_service.py      # CV management logic
│   │   ├── ai_service.py      # AI integration logic
│   │   ├── file_service.py    # File handling logic
│   │   ├── cv_parsing_service.py # CV parsing logic
│   │   ├── job_description_service.py # Job description logic
│   │   ├── latex_export_service.py # PDF export logic
│   │   ├── audit_service.py   # Audit logging
│   │   ├── cleanup_service.py # Background maintenance
│   │   ├── clerk_sync_service.py # Clerk integration
│   │   ├── cv_diff_service.py # CV comparison logic
│   │   ├── impersonation_service.py # Admin impersonation
│   │   ├── user_activity_service.py # User activity tracking
│   │   └── url_parsing_service.py # Job URL parsing with browser automation
│   ├── schemas/               # Pydantic schemas
│   │   └── cv_schemas.py      # CV data validation schemas
│   ├── middleware/            # Custom middleware
│   │   ├── clerk_auth.py      # Clerk authentication
│   │   └── impersonation_headers.py # Impersonation handling
│   └── utils/                 # Utility functions
│       ├── validation.py      # Data validation utilities
│       └── history_validation.py # History validation
├── tests/                     # Test suite
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── conftest.py           # Test configuration
├── uploads/                   # File storage directory
├── main.py                   # Application entry point
├── requirements.txt          # Python dependencies
└── pyproject.toml           # Project configuration
```

## Database Schema

### Core Models

#### User Model
- **Table**: `users`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `clerk_id`: Clerk authentication ID (unique, indexed)
  - `email`: User email (unique, indexed)
  - `password_hash`: Legacy password hash (nullable)
  - `google_id`: Google OAuth ID (nullable, unique, indexed)
  - `is_active`: Account status (boolean)
  - `email_verified`: Email verification status (boolean)
  - `created_at`: Account creation timestamp
  - `updated_at`: Last update timestamp
  - `last_login_at`: Last login timestamp
  - `profile_data`: JSON profile information
  - `is_admin`: Admin status (boolean)

#### CV Model
- **Table**: `cvs`
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `user_id` → `users.id` (CASCADE DELETE)
- **Fields**:
  - `user_id`: Owner user ID (indexed)
  - `original_filename`: Original file name
  - `file_path`: Server file path
  - `file_size`: File size in bytes
  - `file_type`: MIME type
  - `parsed_data`: JSON structured CV data
  - `is_parsed`: Parsing completion status
  - `parse_error`: Parsing error message (nullable)
  - `created_at`: Creation timestamp
  - `updated_at`: Last update timestamp

#### Job Description Model
- **Table**: `job_descriptions`
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: 
  - `user_id` → `users.id` (CASCADE DELETE)
  - `cv_id` → `cvs.id` (CASCADE DELETE, nullable)
- **Fields**:
  - `user_id`: Owner user ID (indexed)
  - `cv_id`: Associated CV ID (indexed, nullable)
  - `content`: Job description full text (nullable)
  - `description`: Structured description (nullable)
  - `requirements`: JSON requirements data (nullable)
  - `salary_range`: Salary information (nullable)
  - `employment_type`: Employment type (nullable)
  - `source_url`: Source URL for job posting (nullable)
  - `title`: Job title (nullable)
  - `company`: Company name (nullable)
  - `location`: Job location (nullable)
  - `hidden`: Hidden from sidebar flag (boolean, default false)
  - `is_parsing`: Background parsing status (boolean, default false)
  - `parse_error`: Parsing error message (nullable)
  - `created_at`: Creation timestamp
  - `updated_at`: Last update timestamp

#### AI Section Model
- **Table**: `ai_sections`
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: 
  - `cv_id` → `cvs.id` (CASCADE DELETE)
  - `job_description_id` → `job_descriptions.id` (CASCADE DELETE)
- **Fields**:
  - `cv_id`: Associated CV ID (indexed)
  - `job_description_id`: Associated job description ID (indexed)
  - `section_content`: Generated content text
  - `suggestions`: JSON suggestions data
  - `optimized_data`: JSON optimized data
  - `section_type`: Type of section (default: "why_good_fit")
  - `generation_prompt`: AI prompt used
  - `created_at`: Creation timestamp
  - `updated_at`: Last update timestamp

#### CV History Model
- **Table**: `cv_history`
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `cv_id` → `cvs.id` (CASCADE DELETE)
- **Fields**:
  - `cv_id`: Associated CV ID (indexed)
  - `version_number`: Version number
  - `data_snapshot`: JSON CV data snapshot
  - `change_summary`: Text description of changes
  - `change_type`: Type of change (manual_save, auto_save, etc.)
  - `is_initial`: Whether this is the initial version
  - `created_at`: Creation timestamp

## API Endpoints

### Authentication Endpoints (`/auth`)
**Note**: Primary authentication is handled by Clerk with JWT token verification. Legacy JWT endpoints are maintained for backward compatibility.
- `POST /auth/register` - Legacy user registration (deprecated, use Clerk)
- `POST /auth/login` - Legacy user login (deprecated, use Clerk)
- `POST /auth/refresh` - Refresh JWT token (legacy)
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info (works with both Clerk and legacy JWT)

### CV Management Endpoints (`/api/cvs`)
- `POST /api/cvs/` - Upload CV file
- `GET /api/cvs/` - List user's CVs
- `GET /api/cvs/{cv_id}` - Get specific CV
- `PUT /api/cvs/{cv_id}` - Update CV data
- `DELETE /api/cvs/{cv_id}` - Delete CV
- `GET /api/cvs/{cv_id}/export` - Export CV as PDF

### Job Description Endpoints (`/api/cvs/{cv_id}/job-descriptions`)
- `POST /api/cvs/{cv_id}/job-descriptions` - Add job description
- `GET /api/cvs/{cv_id}/job-descriptions` - Get job descriptions
- `DELETE /api/job-descriptions/{jd_id}` - Delete job description

### AI Features Endpoints (`/api`)
- `POST /api/cvs/{cv_id}/generate-section` - Generate AI section
- `GET /api/cvs/{cv_id}/ai-sections` - Get AI-generated sections
- `DELETE /api/ai-sections/{section_id}` - Delete AI section
- `POST /api/cvs/{cv_id}/generate-all-suggestions` - Generate AI suggestions for all sections

### CV History Endpoints (`/api/cvs/{cv_id}/history`)
- `GET /api/cvs/{cv_id}/history` - Get CV version history
- `GET /api/cvs/{cv_id}/history/{version_id}` - Get specific version
- `POST /api/cvs/{cv_id}/history/{version_id}/restore` - Restore version

### Admin Endpoints (`/api/admin`)
- `GET /api/admin/users` - List all users
- `GET /api/admin/cvs` - List all CVs
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/impersonate` - Start impersonation session
- `POST /api/admin/stop-impersonation` - Stop impersonation session

### Admin AI Usage Endpoints (`/api/admin/ai-usage`)
- `GET /api/admin/ai-usage/stats` - Get AI usage statistics
- `GET /api/admin/ai-usage/by-user` - Get usage breakdown by user
- `GET /api/admin/ai-usage/by-operation` - Get usage breakdown by operation type
- `GET /api/admin/ai-usage/timeline` - Get usage timeline data
- `GET /api/admin/ai-usage/logs` - Get paginated usage logs
- `DELETE /api/admin/ai-usage/logs` - Delete all usage logs (admin only)

### User Activity Endpoints (`/api/user-activities`)
- `GET /api/user-activities` - Get current user's activity log
- `POST /api/user-activities` - Log a user activity

### CV History Endpoints (`/api/cvs/{cv_id}/history`)
- `GET /api/cvs/{cv_id}/history` - Get CV version history
- `GET /api/cvs/{cv_id}/history/{version_id}` - Get specific version
- `POST /api/cvs/{cv_id}/history/{version_id}/restore` - Restore version
- `POST /api/cvs/{cv_id}/history` - Create new version snapshot

## Services

### Authentication Service
- **Primary**: Clerk JWT token verification with JWKS support for production-ready authentication
- **Secondary**: Legacy JWT token generation and validation for backward compatibility
- Password hashing with bcrypt (legacy accounts only)
- Automatic Clerk user synchronization to local database on first request
- User session management with admin impersonation support
- Role-based access control (admin/user)

### CV Service
- CRUD operations for CV records
- File upload and validation
- CV data parsing and structuring
- User ownership validation

### AI Service
- OpenAI GPT-4o-mini integration
- CV content parsing and extraction
- AI-powered section generation
- Job description analysis

### File Service
- File upload validation (PDF, DOCX)
- File size and type checking
- Secure file storage
- Text extraction from documents

### CV Parsing Service
- Background CV parsing with thread pools
- OpenAI-powered content extraction
- Structured data conversion
- Error handling and retry logic

### Job Description Service
- Job description management
- URL-based job posting extraction with browser automation
- Requirements parsing and structuring
- CV-job matching logic

### URL Parsing Service
- Job posting URL parsing and content extraction
- Selenium-based browser automation for JavaScript-heavy sites
- Fallback logic between standard scraping and browser automation
- Content quality validation and formatting preservation
- Support for complex job sites like jobs.wien.gv.at

### LaTeX Export Service
- PDF generation from CV data via LaTeX compilation
- Professional CV template processing
- A4 format document generation
- Export file management and cleanup

### Impersonation Service
- Admin user impersonation functionality
- Session-based impersonation with security validation
- IP and user agent validation for impersonation sessions
- Audit logging for impersonation activities

### CV History Service
- Version tracking and management
- Automatic snapshot creation
- Version restoration capabilities
- Change tracking and diff generation

### Clerk Sync Service
- User data synchronization from Clerk API
- Profile information enrichment
- Email verification status tracking
- User metadata management

### Audit Service
- User activity logging
- System event tracking
- Security audit trails
- Compliance reporting

### Cleanup Service
- Background maintenance tasks
- Temporary file cleanup
- Database optimization
- Scheduled maintenance

## Security Features

### Authentication & Authorization
- **Primary**: Clerk JWT token verification with JWKS support
- **Secondary**: Legacy JWT-based authentication with refresh tokens
- Clerk integration for external auth providers
- Role-based access control (admin/user)
- Admin impersonation with session-based security
- Session management and timeout

### Data Protection
- Password hashing with bcrypt
- SQL injection prevention via ORM
- XSS protection through input validation
- CORS configuration for cross-origin requests

### File Security
- File type validation and size limits
- Secure file storage with UUID naming
- Virus scanning capabilities (extensible)
- Access control for file downloads

### API Security
- Rate limiting with slowapi
- Input validation with Pydantic
- Error handling without information leakage
- Request/response logging

## Configuration

### Environment Variables
```env
# Database Configuration
DATABASE_URL=sqlite:///./cv_optimizer.db

# Authentication
DEV_MODE=true
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Clerk Integration (Primary Authentication)
CLERK_SECRET_KEY=sk_test_your_secret_key_from_clerk_dashboard
CLERK_VERIFY_TOKENS=true
CLERK_JWKS_URL=https://YOUR-CLERK-DOMAIN/.well-known/jwks.json
CLERK_ISSUER=https://YOUR-CLERK-DOMAIN
CLERK_AUDIENCE=YOUR_BACKEND_AUDIENCE
ADMIN_EMAIL=your-admin@email.com

# OpenAI Configuration
OPENAI_API_KEY=your-openai-key-here

# Browser Automation Configuration
# Selenium browser automation is used for JavaScript-heavy job sites
# No additional configuration required - runs locally without API keys
# Chrome browser must be installed on the system

# Application Settings
DEBUG=true
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document
CV_PARSE_WORKERS=2
CORS_ALLOW_ORIGINS=http://localhost:3000
```

## Testing

### Test Structure
- **Unit Tests**: Individual service and model testing
- **Integration Tests**: API endpoint testing
- **Test Coverage**: Comprehensive test coverage with pytest
- **Test Database**: Separate SQLite test database
- **Background Task Testing**: Thread pool and async operation testing

### Test Categories
- Authentication and authorization tests (Clerk and legacy JWT)
- CV management workflow tests
- AI service integration tests
- File upload and processing tests
- Database operation tests
- Background task and thread pool tests
- Impersonation and admin functionality tests
- CV history and version management tests
- Error handling and edge case tests

## Deployment

### Development
- SQLite database for local development
- Hot reload with uvicorn
- Debug mode enabled
- Local file storage

### Production
- PostgreSQL database
- Gunicorn WSGI server
- Nginx reverse proxy
- Docker containerization
- Environment-specific configuration

### Docker Configuration
- Multi-stage Dockerfile for optimization
- Docker Compose for local development
- Production Docker Compose with PostgreSQL
- Health checks and monitoring

## Performance

### Optimization Features
- Database connection pooling
- Background task processing
- File compression middleware
- Efficient query optimization
- Caching strategies (extensible)

### Scalability
- Horizontal scaling support
- Load balancer compatibility
- Database read replicas support
- Microservices architecture ready

## Monitoring & Logging

### Logging
- Structured logging with Python logging
- Request/response logging
- Error tracking and reporting
- Performance metrics collection

### Health Checks
- Database connectivity checks
- External service health monitoring
- System resource monitoring
- API endpoint health status

## Error Handling

### Error Types
- Validation errors with detailed messages
- Authentication and authorization errors
- File processing errors
- AI service errors
- Database operation errors

### Error Response Format
```json
{
  "message": "Error description",
  "detail": "Detailed error information",
  "status_code": 400,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Dependencies

### Core Dependencies
- FastAPI 0.104.1 - Web framework
- uvicorn[standard] 0.24.0 - ASGI server
- SQLAlchemy 2.0.23 - ORM
- Alembic 1.12.1 - Database migrations
- Pydantic 2.3.0 - Data validation
- pydantic-settings 2.0.3 - Settings management
- OpenAI >=1.68.0 - AI integration (Responses API support)
- PyMuPDF 1.26.4 - PDF processing
- python-docx 1.1.0 - DOCX processing
- Selenium 4.15.0 - Browser automation for web scraping
- requests 2.31.0 - HTTP client for web scraping
- beautifulsoup4 4.12.2 - HTML parsing
- python-jose[cryptography] 3.3.0 - JWT token handling (legacy)
- passlib[bcrypt] 1.7.4 - Password hashing (legacy)
- slowapi 0.1.9 - Rate limiting

### Development Dependencies
- pytest 7.4.3 - Testing framework
- httpx 0.25.2 - HTTP client for testing
- pytest-asyncio 0.21.1 - Async testing support

This specification provides a comprehensive overview of the CV Lator backend architecture, enabling complete regeneration of the system with all its features and capabilities.
