# Data Model: CV Optimization SaaS Application

## Entity Overview

The application manages four main entities:
1. **Users** - Authentication and user management
2. **CVs** - CV documents and parsed data
3. **Job Descriptions** - Job postings and requirements
4. **AI Sections** - Generated content by AI

## Entity Definitions

### User Entity
**Purpose**: Store user authentication and profile information

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `email` (VARCHAR(255), Unique, Not Null): User's email address
- `password_hash` (VARCHAR(255), Nullable): Hashed password for email/password auth
- `google_id` (VARCHAR(255), Nullable): Google OAuth identifier
- `is_active` (BOOLEAN, Default: true): Account status
- `email_verified` (BOOLEAN, Default: false): Email verification status
- `created_at` (TIMESTAMP, Default: NOW()): Account creation time
- `updated_at` (TIMESTAMP, Default: NOW()): Last update time
- `last_login` (TIMESTAMP, Nullable): Last login timestamp

**Validation Rules**:
- Email must be valid format
- Password must be at least 8 characters (if using password auth)
- Google ID must be unique (if provided)

**State Transitions**:
- `inactive` → `active` (account activation)
- `unverified` → `verified` (email verification)

### CV Entity
**Purpose**: Store CV files and parsed structured data

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID, Foreign Key): Owner of the CV
- `original_filename` (VARCHAR(255), Not Null): Original uploaded filename
- `file_path` (VARCHAR(500), Not Null): Server file path
- `file_size` (INTEGER, Not Null): File size in bytes
- `file_type` (VARCHAR(50), Not Null): MIME type (application/pdf, etc.)
- `parsed_data` (JSONB, Not Null): Structured CV data
- `is_parsed` (BOOLEAN, Default: false): Parsing completion status
- `parse_error` (TEXT, Nullable): Error message if parsing failed
- `created_at` (TIMESTAMP, Default: NOW()): Upload time
- `updated_at` (TIMESTAMP, Default: NOW()): Last modification time

**Validation Rules**:
- File size must be ≤ 10MB
- File type must be in whitelist (PDF, DOC, DOCX)
- Parsed data must be valid JSON
- User must exist and be active

**State Transitions**:
- `uploaded` → `parsing` → `parsed` (successful parsing)
- `uploaded` → `parsing` → `failed` (parsing error)

### Job Description Entity
**Purpose**: Store job descriptions for CV optimization

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `cv_id` (UUID, Foreign Key): Associated CV
- `content` (TEXT, Not Null): Job description text
- `source_url` (VARCHAR(500), Nullable): Original URL if scraped
- `title` (VARCHAR(255), Nullable): Job title if extracted
- `company` (VARCHAR(255), Nullable): Company name if extracted
- `location` (VARCHAR(255), Nullable): Job location if extracted
- `created_at` (TIMESTAMP, Default: NOW()): Creation time

**Validation Rules**:
- Content must not be empty
- CV must exist and belong to active user
- URL must be valid format (if provided)

### AI Section Entity
**Purpose**: Store AI-generated content for CVs

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `cv_id` (UUID, Foreign Key): Associated CV
- `job_description_id` (UUID, Foreign Key): Associated job description
- `section_content` (TEXT, Not Null): Generated content
- `section_type` (VARCHAR(50), Default: 'why_good_fit'): Type of section
- `generation_prompt` (TEXT, Nullable): Prompt used for generation
- `model_used` (VARCHAR(50), Default: 'gpt-4o-mini'): AI model identifier
- `tokens_used` (INTEGER, Nullable): Number of tokens consumed
- `generation_time` (INTEGER, Nullable): Generation time in milliseconds
- `is_active` (BOOLEAN, Default: true): Whether section is currently active
- `created_at` (TIMESTAMP, Default: NOW()): Generation time

**Validation Rules**:
- Section content must not be empty
- CV and job description must exist
- Section type must be valid enum value

## JSON Schema for CV Parsed Data

The `parsed_data` field in the CV entity contains structured JSON with the following schema:

```json
{
  "personal_info": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin_url": "string",
    "website_url": "string"
  },
  "professional_summary": {
    "content": "string",
    "keywords": ["string"]
  },
  "work_experience": [
    {
      "company": "string",
      "position": "string",
      "start_date": "string",
      "end_date": "string",
      "current": "boolean",
      "description": "string",
      "achievements": ["string"],
      "technologies": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field_of_study": "string",
      "start_date": "string",
      "end_date": "string",
      "gpa": "string",
      "honors": ["string"]
    }
  ],
  "skills": {
    "technical": ["string"],
    "soft": ["string"],
    "languages": [
      {
        "language": "string",
        "proficiency": "string"
      }
    ]
  },
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string",
      "expiry_date": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "url": "string",
      "start_date": "string",
      "end_date": "string"
    }
  ],
  "awards": [
    {
      "title": "string",
      "issuer": "string",
      "date": "string",
      "description": "string"
    }
  ],
  "publications": [
    {
      "title": "string",
      "authors": ["string"],
      "journal": "string",
      "date": "string",
      "url": "string"
    }
  ],
  "volunteer_experience": [
    {
      "organization": "string",
      "role": "string",
      "start_date": "string",
      "end_date": "string",
      "description": "string"
    }
  ]
}
```

## Database Relationships

### One-to-Many Relationships
- User → CVs (one user can have multiple CVs)
- CV → Job Descriptions (one CV can have multiple job descriptions)
- CV → AI Sections (one CV can have multiple AI sections)
- Job Description → AI Sections (one job description can generate multiple AI sections)

### Foreign Key Constraints
- `cvs.user_id` → `users.id` (CASCADE DELETE)
- `job_descriptions.cv_id` → `cvs.id` (CASCADE DELETE)
- `ai_sections.cv_id` → `cvs.id` (CASCADE DELETE)
- `ai_sections.job_description_id` → `job_descriptions.id` (CASCADE DELETE)

## Indexes

### Performance Indexes
- `users.email` (UNIQUE INDEX) - Fast login lookups
- `users.google_id` (UNIQUE INDEX) - Fast OAuth lookups
- `cvs.user_id` (INDEX) - Fast user CV queries
- `cvs.created_at` (INDEX) - CV ordering
- `job_descriptions.cv_id` (INDEX) - Fast job description queries
- `ai_sections.cv_id` (INDEX) - Fast AI section queries
- `ai_sections.job_description_id` (INDEX) - Fast AI section queries

### JSONB Indexes
- `cvs.parsed_data` (GIN INDEX) - Fast JSON queries
- `cvs.parsed_data->'personal_info'->>'full_name'` (INDEX) - Name searches
- `cvs.parsed_data->'skills'->>'technical'` (INDEX) - Skill searches

## Data Validation

### Database Level Validation
- NOT NULL constraints on required fields
- UNIQUE constraints on unique fields
- CHECK constraints for enum values
- FOREIGN KEY constraints for referential integrity

### Application Level Validation
- Email format validation
- File type and size validation
- JSON schema validation for parsed data
- Business rule validation (e.g., end date after start date)

## Data Migration Strategy

### Initial Migration
- Create all tables with proper constraints
- Add indexes for performance
- Set up foreign key relationships

### Future Migrations
- Add new fields with DEFAULT values
- Modify existing fields with data transformation
- Add new indexes without downtime
- Remove deprecated fields after data migration

## Data Retention Policy

### User Data
- Retain for 3 years after last activity
- Anonymize after retention period
- Allow user-initiated deletion (GDPR compliance)

### CV Data
- Retain for 1 year after last access
- Delete associated files from storage
- Maintain audit log for compliance

### AI Generated Content
- Retain for 6 months for improvement purposes
- Anonymize after retention period
- Allow user deletion at any time

## Backup Strategy

### Database Backups
- Daily automated backups
- Point-in-time recovery capability
- Cross-region backup replication
- Regular backup restoration testing

### File Storage Backups
- Daily file system snapshots
- Cross-region replication
- Versioning for file changes
- Regular backup integrity checks

## Security Considerations

### Data Encryption
- Encrypt sensitive data at rest
- Use TLS for data in transit
- Hash passwords with bcrypt
- Encrypt file storage

### Access Control
- Role-based access control
- API key authentication
- Rate limiting per user
- Audit logging for data access

### Privacy Protection
- Data minimization principles
- User consent management
- Right to be forgotten implementation
- Data portability features
