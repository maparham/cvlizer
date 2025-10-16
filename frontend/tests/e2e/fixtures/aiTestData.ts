/**
 * Test data for AI feature E2E tests
 *
 * This file provides reusable test data for job descriptions, drafts,
 * and content enhancement scenarios.
 */

export interface TestJobDescription {
  title: string;
  company: string;
  url?: string;
  content: string;
  requirements?: string[];
}

export const testJobDescriptions: Record<string, TestJobDescription> = {
  softwareEngineer: {
    title: "Senior Software Engineer",
    company: "Tech Corp",
    url: "https://example.com/jobs/senior-software-engineer",
    content: `We are looking for a Senior Software Engineer with strong experience in:
- Python and FastAPI
- React and TypeScript
- Database design (PostgreSQL, SQLAlchemy)
- RESTful API development
- Cloud platforms (AWS, Azure)
- Docker and containerization

The ideal candidate will have 5+ years of experience building scalable web applications.`,
    requirements: ["Python", "React", "PostgreSQL", "Docker"],
  },

  frontendDeveloper: {
    title: "Frontend Developer",
    company: "Design Studio Inc",
    content: `Seeking a talented Frontend Developer to join our team:
- Expert in React, TypeScript, and modern JavaScript
- Experience with Material-UI or similar component libraries
- Strong CSS and responsive design skills
- Performance optimization experience
- 3+ years professional experience`,
    requirements: ["React", "TypeScript", "CSS", "Material-UI"],
  },

  fullStackEngineer: {
    title: "Full Stack Engineer",
    company: "StartupXYZ",
    content: `Full Stack Engineer needed for fast-paced startup:
- Backend: Python, Node.js, or similar
- Frontend: React or Vue.js
- Database: SQL and NoSQL experience
- API design and microservices
- Agile development methodology`,
    requirements: ["Python", "React", "SQL", "Microservices"],
  },
};

export const testDraftContent = {
  professionalSummary:
    "Experienced software engineer with 5 years of expertise in full-stack development.",
  skillsBulletPoint: "Proficient in Python, FastAPI, and React development",
  workExperienceDescription:
    "Led development of microservices architecture serving 1M+ users",
};

export const testEnhancementContent = {
  original: "Good at coding and problem solving",
  enhanced: [
    "Highly proficient in software development with strong analytical and problem-solving capabilities",
    "Expert programmer with demonstrated ability to analyze complex challenges and deliver effective solutions",
    "Skilled software engineer with proven track record in code development and systematic problem resolution",
  ],
};

/**
 * Job description data for manual entry (no URL)
 */
export const manualJobDescription: TestJobDescription = {
  title: "Backend Developer",
  company: "Enterprise Solutions Ltd",
  content: `Backend Developer position:
- Strong Python and database skills
- Experience with FastAPI or Django
- RESTful API design
- Unit testing and TDD
- 4+ years experience required`,
  requirements: ["Python", "FastAPI", "Testing", "APIs"],
};

/**
 * Test data for job fit analysis expectations
 */
export const expectedJobFitAnalysis = {
  minConfidenceScore: 60,
  maxConfidenceScore: 100,
  requiredFields: ["confidence_score", "fit_analysis", "key_matches"],
};
