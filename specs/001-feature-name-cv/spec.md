# CV Optimization SaaS Application Specification

## Overview
A web-based SaaS application that helps job seekers optimize their CVs by uploading, parsing, editing, and enhancing them with AI-generated content tailored to specific job descriptions.

## Core Features

### 1. CV Upload and Parsing
- **Upload Interface**: Direct file upload from homepage (supports PDF, DOC, DOCX)
- **File Processing**: Backend stores uploaded files and parses them into structured JSON
- **CV Parsing**: Uses OpenAI API to extract common CV sections (personal info, experience, education, skills, etc.)
- **Data Storage**: Parsed JSON stored in PostgreSQL database
- **Preview Mode**: Users can view parsed CV data in a read-only format

### 2. User Authentication
- **Signup Options**: Email/password or Google OAuth integration
- **Authentication Required**: Users must sign up to edit their CV
- **Session Management**: Secure session handling with JWT tokens

### 3. CV Editing Interface
- **Drag-and-Drop Reordering**: Sections and individual lines can be reordered
- **Inline Editing**: Text can be edited directly in the interface
- **Auto-Save**: Changes are automatically saved to the database
- **Real-time Preview**: Live preview of CV changes

### 4. Job Description Integration
- **Job Description Input**: Users can paste job description text or provide a URL
- **URL Parsing**: Automatic extraction of job description from provided URLs
- **Job Description Storage**: Stored alongside CV data for AI processing

### 5. AI-Enhanced CV Generation
- **OpenAI Integration**: Uses GPT5-mini to analyze CV and job description
- **Custom Section Generation**: Creates tailored "Why I'm a Good Fit" section
- **Context-Aware**: AI considers both CV content and specific job requirements

## Technical Architecture

### Backend (Python)
- **Framework**: FastAPI for high-performance API
- **Database**: PostgreSQL with SQLAlchemy ORM
- **File Storage**: Local filesystem (configurable for cloud storage)
- **Authentication**: JWT with OAuth2 integration
- **AI Integration**: OpenAI API client
- **Documentation**: OpenAPI/Swagger auto-generated

### Frontend (TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI or Chakra UI for components
- **State Management**: Redux Toolkit or Zustand
- **Drag & Drop**: React Beautiful DnD or @dnd-kit
- **HTTP Client**: Axios for API communication
- **Build Tool**: Vite for fast development and building

### Database Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- CVs table
CREATE TABLE cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    parsed_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Job descriptions table
CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID REFERENCES cvs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI-generated sections table
CREATE TABLE ai_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID REFERENCES cvs(id) ON DELETE CASCADE,
    job_description_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
    section_content TEXT NOT NULL,
    section_type VARCHAR(50) DEFAULT 'why_good_fit',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/google` - Google OAuth login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout

### CV Management
- `POST /api/cvs/upload` - Upload CV file
- `GET /api/cvs/{cv_id}` - Get CV data
- `PUT /api/cvs/{cv_id}` - Update CV data
- `DELETE /api/cvs/{cv_id}` - Delete CV
- `GET /api/cvs` - List user's CVs

### Job Descriptions
- `POST /api/cvs/{cv_id}/job-descriptions` - Add job description
- `GET /api/cvs/{cv_id}/job-descriptions` - Get job descriptions for CV
- `DELETE /api/job-descriptions/{jd_id}` - Delete job description

### AI Features
- `POST /api/cvs/{cv_id}/generate-section` - Generate AI section
- `GET /api/cvs/{cv_id}/ai-sections` - Get AI-generated sections

## Security Considerations

### Authentication & Authorization
- JWT tokens with short expiration (15 minutes) and refresh tokens
- Password hashing using bcrypt with salt rounds
- OAuth2 integration with Google
- Rate limiting on authentication endpoints

### File Upload Security
- File type validation (whitelist approach)
- File size limits (max 10MB)
- Virus scanning for uploaded files
- Secure file storage with random filenames

### Data Protection
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS protection with proper escaping
- CORS configuration for frontend domain

### API Security
- Rate limiting per endpoint
- Request validation using Pydantic models
- API key management for OpenAI integration
- Error handling without sensitive data exposure

## Error Handling

### Backend Error Handling
- Structured error responses with error codes
- Logging with appropriate levels (DEBUG, INFO, WARNING, ERROR)
- Graceful degradation for AI service failures
- Database connection error handling

### Frontend Error Handling
- User-friendly error messages
- Retry mechanisms for failed requests
- Loading states and progress indicators
- Offline detection and handling

### Common Error Scenarios
- File upload failures
- AI service timeouts
- Database connection issues
- Authentication token expiration
- Invalid file formats

## Testing Strategy

### Backend Testing
- **Unit Tests**: Individual function testing with pytest
- **Integration Tests**: API endpoint testing with TestClient
- **Database Tests**: Model and query testing
- **AI Service Tests**: Mock OpenAI responses
- **Security Tests**: Authentication and authorization testing

### Frontend Testing
- **Unit Tests**: Component testing with Jest and React Testing Library
- **Integration Tests**: API integration testing
- **E2E Tests**: Full user workflow testing with Playwright
- **Accessibility Tests**: WCAG compliance testing

### Test Coverage Goals
- Backend: 90% code coverage
- Frontend: 85% code coverage
- Critical paths: 100% test coverage

## Performance Requirements

### Response Times
- API responses: < 200ms (95th percentile)
- File upload: < 5 seconds for 10MB files
- AI generation: < 30 seconds
- Page load: < 2 seconds

### Scalability
- Support for 1000 concurrent users
- Database connection pooling
- Caching for frequently accessed data
- CDN for static assets

## Deployment Strategy

### Local Development
- Docker Compose for local environment
- Hot reload for both frontend and backend
- Local PostgreSQL database
- Environment variable configuration

### Production Deployment
- **Backend**: AWS ECS or Google Cloud Run
- **Frontend**: AWS S3 + CloudFront or Vercel
- **Database**: AWS RDS PostgreSQL or Google Cloud SQL
- **File Storage**: AWS S3 or Google Cloud Storage
- **Monitoring**: CloudWatch or Google Cloud Monitoring

### Environment Configuration
- Development, staging, and production environments
- Environment-specific configuration files
- Secrets management with AWS Secrets Manager or Google Secret Manager
- CI/CD pipeline with GitHub Actions

## Development Guidelines

### Code Quality
- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **Clean Code**: Meaningful names, small functions, minimal comments
- **Type Safety**: Full TypeScript coverage, strict mode enabled
- **Code Formatting**: Prettier for frontend, Black for backend

### Git Workflow
- Feature branches with descriptive names
- Pull request reviews required
- Conventional commit messages
- Automated testing on pull requests

### Documentation
- API documentation with OpenAPI/Swagger
- Component documentation with Storybook
- README with setup instructions
- Architecture decision records (ADRs)

## Future Enhancements

### Phase 2 Features
- Multiple CV templates
- PDF export functionality
- CV analytics and insights
- Team collaboration features
- Advanced AI customization

### Scalability Improvements
- Microservices architecture
- Event-driven architecture
- Caching layer (Redis)
- Message queue for AI processing
- Multi-region deployment

## Success Metrics

### User Engagement
- CV upload completion rate
- Time spent editing CVs
- AI section generation usage
- User retention rate

### Technical Metrics
- API response times
- Error rates
- System uptime
- Database performance

### Business Metrics
- User acquisition cost
- Monthly active users
- Feature adoption rates
- Customer satisfaction scores

## Risk Mitigation

### Technical Risks
- AI service downtime → Fallback to template responses
- Database performance → Query optimization and indexing
- File storage issues → Multiple storage backends
- Security breaches → Regular security audits

### Business Risks
- User adoption → User research and feedback
- Competition → Unique value proposition
- Scalability costs → Efficient resource utilization
- Data privacy → GDPR compliance

## Compliance

### Data Privacy
- GDPR compliance for EU users
- Data retention policies
- User data export functionality
- Right to be forgotten implementation

### Security Standards
- OWASP security guidelines
- Regular security audits
- Penetration testing
- Vulnerability scanning

This specification provides a comprehensive foundation for building the CV optimization SaaS application with clean, maintainable code that follows SOLID principles and is ready for both local development and cloud deployment.
