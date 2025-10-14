/**
 * Test data utilities for consistent test data across all frontend tests
 */

export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  is_active: true,
  email_verified: true,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
};

export const mockCV = {
  id: "cv-123",
  user_id: "user-123",
  original_filename: "test-cv.pdf",
  file_path: "/uploads/test-cv.pdf",
  file_size: 1024,
  file_type: "application/pdf",
  parsed_data: {
    personal_info: {
      full_name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      location: "New York, NY",
    },
    professional_summary:
      "Experienced software developer with 5+ years of experience.",
    work_experience: [
      {
        id: "exp-1",
        company: "Tech Corp",
        position: "Senior Developer",
        start_date: "2020-01-01",
        end_date: "2023-12-31",
        description: "Led development of web applications",
        location: "New York, NY",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "University of Technology",
        degree: "Bachelor of Computer Science",
        field_of_study: "Computer Science",
        start_date: "2016-09-01",
        end_date: "2020-05-31",
        gpa: "3.8",
        location: "Boston, MA",
      },
    ],
    skills: [
      { id: "skill-1", name: "JavaScript", category: "Programming Languages" },
      { id: "skill-2", name: "React", category: "Frameworks" },
      { id: "skill-3", name: "Node.js", category: "Backend" },
    ],
    projects: [
      {
        id: "proj-1",
        name: "E-commerce Platform",
        description: "Full-stack e-commerce application",
        start_date: "2022-01-01",
        end_date: "2022-06-30",
        technologies: ["React", "Node.js", "MongoDB"],
        url: "https://example.com/project1",
      },
    ],
    certifications: [
      {
        id: "cert-1",
        name: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        issue_date: "2022-03-15",
        expiry_date: "2025-03-15",
        credential_id: "AWS-DEV-123456",
      },
    ],
    publications: [
      {
        id: "pub-1",
        title: "Modern Web Development Practices",
        authors: ["John Doe"],
        publication_date: "2022-08-15",
        journal: "Tech Journal",
        url: "https://example.com/publication1",
      },
    ],
    awards: [
      {
        id: "award-1",
        name: "Employee of the Year",
        issuer: "Tech Corp",
        date: "2022-12-15",
        description: "Recognized for outstanding performance",
      },
    ],
    volunteer_experience: [
      {
        id: "vol-1",
        organization: "Code for Good",
        position: "Volunteer Developer",
        start_date: "2021-01-01",
        end_date: "2021-12-31",
        description: "Developed web applications for non-profits",
        location: "Remote",
      },
    ],
  },
  is_parsed: true,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
};

export const mockJobDescription = {
  id: "job-123",
  title: "Senior Software Engineer",
  company: "Tech Company",
  description: "We are looking for a senior software engineer...",
  requirements: [
    "5+ years of experience in software development",
    "Strong knowledge of JavaScript and React",
    "Experience with Node.js and databases",
  ],
  location: "New York, NY",
  salary_range: "$100,000 - $150,000",
  employment_type: "Full-time",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
};

export const mockAISuggestions = {
  personal_info: {
    suggestions: [
      {
        field: "full_name",
        current: "John Doe",
        suggested: "John A. Doe",
        reason: "Adding middle initial for professionalism",
      },
    ],
  },
  professional_summary: {
    suggestions: [
      {
        field: "summary",
        current: "Experienced software developer with 5+ years of experience.",
        suggested:
          "Senior Software Engineer with 5+ years of experience developing scalable web applications using modern technologies.",
        reason: "More specific and impactful summary",
      },
    ],
  },
  work_experience: {
    suggestions: [
      {
        field: "description",
        current: "Led development of web applications",
        suggested:
          "Led development of web applications serving 10,000+ users, resulting in 30% increase in user engagement",
        reason: "Add quantifiable achievements",
      },
    ],
  },
};

export const mockFile = new File(["test content"], "test.pdf", {
  type: "application/pdf",
});

export const mockLargeFile = new File(["test content"], "large.pdf", {
  type: "application/pdf",
});

// Mock file with size > 10MB
Object.defineProperty(mockLargeFile, "size", {
  value: 11 * 1024 * 1024, // 11MB
});

export const mockInvalidFile = new File(["test content"], "test.txt", {
  type: "text/plain",
});

export const mockAPIError = {
  response: {
    data: {
      detail: "Test error message",
    },
    status: 400,
  },
};

export const mockAuthTokens = {
  access_token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.test",
  refresh_token: "refresh.token.here",
  token_type: "bearer",
  expires_in: 900,
};

export const mockPaginationResponse = {
  cvs: [mockCV],
  total: 1,
  page: 1,
  limit: 10,
  pages: 1,
};

export const mockEmptyPaginationResponse = {
  cvs: [],
  total: 0,
  page: 1,
  limit: 10,
  pages: 0,
};
