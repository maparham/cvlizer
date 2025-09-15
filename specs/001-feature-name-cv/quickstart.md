# Quickstart Guide: CV Optimization SaaS Application

## Prerequisites

Before running the application, ensure you have the following installed:

- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **PostgreSQL 14+**
- **Docker** and **Docker Compose** (optional, for containerized setup)
- **Git** for version control

## Local Development Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone <repository-url>
cd cv_lator

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r backend/requirements.txt

# Install Node.js dependencies
cd frontend
npm install
cd ..
```

### 2. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker run --name cv-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=cv_optimizer -p 5432:5432 -d postgres:14

# Or install PostgreSQL locally and create database
createdb cv_optimizer
```

### 3. Environment Configuration

Create environment files:

**Backend (.env)**:
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cv_optimizer

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

**Frontend (.env)**:
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Database Migration

```bash
# Run database migrations
cd backend
alembic upgrade head
cd ..
```

### 5. Start Development Servers

**Terminal 1 - Backend**:
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432

## Docker Setup (Alternative)

### 1. Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Docker Compose Configuration

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: cv_optimizer
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/cv_optimizer
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
      - ./uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

## Testing the Application

### 1. Backend Tests

```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html
```

### 2. Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

### 3. End-to-End Tests

```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e
```

## User Workflow Testing

### 1. User Registration and Login

1. Navigate to http://localhost:3000
2. Click "Sign Up" and create an account
3. Verify email (in development, check console logs)
4. Login with credentials

### 2. CV Upload and Parsing

1. Login to the application
2. Click "Upload CV" on the homepage
3. Select a PDF, DOC, or DOCX file
4. Wait for parsing to complete
5. Review the parsed CV data

### 3. CV Editing

1. Click on a CV from the dashboard
2. Edit text fields directly
3. Drag and drop to reorder sections
4. Verify auto-save functionality
5. Check that changes persist after refresh

### 4. Job Description Integration

1. Open a CV
2. Click "Add Job Description"
3. Paste job description text or provide URL
4. Save the job description

### 5. AI Section Generation

1. With a CV and job description added
2. Click "Generate AI Section"
3. Wait for AI processing
4. Review the generated content
5. Add the section to the CV if desired

## API Testing

### 1. Using Swagger UI

1. Navigate to http://localhost:8000/docs
2. Click "Authorize" and enter JWT token
3. Test endpoints interactively

### 2. Using curl

```bash
# Register user
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Login
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Upload CV (replace TOKEN with actual token)
curl -X POST "http://localhost:8000/api/cvs" \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@sample_cv.pdf"
```

### 3. Using Postman

1. Import the OpenAPI specification from `contracts/openapi.yaml`
2. Set up environment variables for base URL and tokens
3. Test all endpoints systematically

## Troubleshooting

### Common Issues

**Database Connection Error**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d cv_optimizer
```

**File Upload Issues**:
```bash
# Check file permissions
ls -la uploads/

# Check file size limits
# Ensure files are under 10MB
```

**AI Generation Fails**:
```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Check API quota
# Visit https://platform.openai.com/usage
```

**Frontend Build Issues**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
```

### Logs and Debugging

**Backend Logs**:
```bash
# View application logs
tail -f backend/logs/app.log

# View database logs
docker logs cv-postgres
```

**Frontend Logs**:
```bash
# Browser developer tools
# Check Network tab for API calls
# Check Console for errors
```

## Production Deployment

### 1. Environment Setup

```bash
# Set production environment variables
export ENVIRONMENT=production
export DEBUG=false
export DATABASE_URL=postgresql://user:pass@prod-db:5432/cv_optimizer
```

### 2. Database Migration

```bash
# Run production migrations
alembic upgrade head
```

### 3. Build and Deploy

```bash
# Build frontend
cd frontend
npm run build

# Build backend Docker image
cd ../backend
docker build -t cv-optimizer-backend .

# Deploy to cloud platform
# (AWS ECS, Google Cloud Run, etc.)
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Check API health
curl http://localhost:8000/health

# Check database connection
curl http://localhost:8000/health/db
```

### 2. Performance Monitoring

```bash
# Monitor API response times
# Check database query performance
# Monitor file storage usage
```

### 3. Security Updates

```bash
# Update dependencies
pip install --upgrade -r requirements.txt
npm update

# Run security scans
npm audit
pip-audit
```

## Support and Documentation

- **API Documentation**: http://localhost:8000/docs
- **Component Documentation**: http://localhost:3000/storybook
- **Database Schema**: See `data-model.md`
- **Architecture**: See `research.md`

## Next Steps

1. **Customize Configuration**: Modify environment variables for your needs
2. **Add Features**: Implement additional CV sections or AI capabilities
3. **Scale**: Deploy to cloud platforms for production use
4. **Monitor**: Set up logging and monitoring for production
5. **Secure**: Implement additional security measures as needed
