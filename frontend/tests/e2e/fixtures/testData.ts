/**
 * Test Data Fixtures
 *
 * Contains sample data for testing CV functionality
 */

export const TEST_PERSONAL_INFO = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  location: 'New York, NY, USA'
};

export const TEST_WORK_EXPERIENCE = {
  position: 'Software Engineer',
  company: 'Tech Corp',
  location: 'San Francisco, CA, USA',
  startDate: {
    day: '01',
    month: '01',
    year: '2022'
  },
  endDate: {
    day: '31',
    month: '12',
    year: '2023'
  },
  description: 'Developed and maintained web applications using React and Node.js'
};

export const TEST_EDUCATION = {
  institution: 'University of Technology',
  degree: 'Bachelor of Science',
  fieldOfStudy: 'Computer Science',
  startDate: {
    day: '01',
    month: '09',
    year: '2018'
  },
  endDate: {
    day: '31',
    month: '05',
    year: '2022'
  }
};

export const TEST_PROJECT = {
  title: 'E-commerce Platform',
  description: 'Built a full-stack e-commerce platform with React and Express.js',
  technologies: ['React', 'Node.js', 'MongoDB'],
  url: 'https://github.com/johndoe/ecommerce'
};

export const SAMPLE_CV_DATA = {
  personal_info: TEST_PERSONAL_INFO,
  work_experience: [TEST_WORK_EXPERIENCE],
  education: [TEST_EDUCATION],
  projects: [TEST_PROJECT]
};

/**
 * File paths for test files
 */
export const TEST_FILES = {
  SAMPLE_PDF: 'test-files/sample-cv.pdf',
  SAMPLE_DOC: 'test-files/sample-cv.doc',
  SAMPLE_DOCX: 'test-files/sample-cv.docx'
} as const;
