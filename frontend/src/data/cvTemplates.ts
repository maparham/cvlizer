/**
 * CV Template Data
 *
 * This module contains predefined CV templates with sample data for different
 * career levels and use cases. Templates provide structured starting points
 * for CV creation with appropriate section ordering and sample content.
 *
 * Key responsibilities:
 * - Define template structures for different career levels
 * - Provide sample data that users can customize
 * - Maintain consistent data structure across templates
 * - Support template selection and customization
 *
 * Usage:
 * - Import templates in CVTemplateSelector component
 * - Use template data to initialize new CVs
 * - Extend with additional templates as needed
 */

import { CVData } from "../types";

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  sampleData: Partial<CVData>;
}

// Student Template
const studentTemplate: CVTemplate = {
  id: "student",
  name: "Student Template",
  description:
    "Perfect for students, recent graduates, and entry-level positions",
  sections: [
    "Education",
    "Projects",
    "Internships",
    "Volunteer Work",
    "Skills",
  ],
  sampleData: {
    personal_info: {
      full_name: "Your Full Name",
      email: "your.email@university.edu",
      phone: "(555) 123-4567",
      location: "City, State",
      linkedin_url: "https://linkedin.com/in/yourprofile",
      website_url: "",
    },
    professional_summary: {
      content:
        "Motivated student with strong academic background and hands-on project experience. Seeking opportunities to apply technical skills and contribute to innovative projects.",
      keywords: [
        "Student",
        "Recent Graduate",
        "Eager to Learn",
        "Project Experience",
      ],
    },
    education: [
      {
        id: "edu-1",
        institution: "University Name",
        degree: "Bachelor of Science",
        field_of_study: "Computer Science",
        start_date: "2020-09-01",
        end_date: "2024-05-01",
        current: false,
        gpa: "3.8",
        honors: ["Dean's List", "Summa Cum Laude"],
      },
    ],
    projects: [
      {
        id: "proj-1",
        name: "Capstone Project",
        description: "Developed a web application using modern technologies",
        technologies: ["React", "Node.js", "MongoDB"],
        url: "https://github.com/yourusername/capstone-project",
      },
    ],
    skills: {
      technical: ["Python", "JavaScript", "React", "SQL"],
      soft: ["Problem Solving", "Teamwork", "Communication"],
      languages: [
        { id: "lang-1", language: "English", proficiency: "Native" },
        { id: "lang-2", language: "Spanish", proficiency: "Intermediate" },
      ],
    },
  },
};

// Professional Template
const professionalTemplate: CVTemplate = {
  id: "professional",
  name: "Professional Template",
  description: "Ideal for mid-level professionals with work experience",
  sections: ["Work Experience", "Skills", "Education", "Certifications"],
  sampleData: {
    personal_info: {
      full_name: "Your Full Name",
      email: "your.email@company.com",
      phone: "(555) 123-4567",
      location: "City, State",
      linkedin_url: "https://linkedin.com/in/yourprofile",
      website_url: "https://yourportfolio.com",
    },
    professional_summary: {
      content:
        "Experienced professional with 5+ years in [Industry]. Proven track record of delivering results and leading cross-functional teams. Strong expertise in [Key Skills].",
      keywords: [
        "Experienced",
        "Results-Driven",
        "Team Leadership",
        "Industry Expertise",
      ],
    },
    work_experience: [
      {
        id: "work-1",
        company: "Current Company",
        position: "Senior [Role]",
        location: "City, State",
        start_date: "2022-01-01",
        end_date: "",
        current: true,
        description:
          "Lead development of key projects and mentor junior team members",
        achievements: [
          "Increased team productivity by 25%",
          "Successfully delivered 3 major projects on time",
        ],
        technologies: ["React", "TypeScript", "AWS", "Docker"],
      },
      {
        id: "work-2",
        company: "Previous Company",
        position: "[Role]",
        location: "City, State",
        start_date: "2020-06-01",
        end_date: "2021-12-01",
        current: false,
        description: "Developed and maintained web applications",
        achievements: [
          "Improved application performance by 40%",
          "Collaborated with design team on UX improvements",
        ],
        technologies: ["JavaScript", "Node.js", "PostgreSQL"],
      },
    ],
    skills: {
      technical: ["JavaScript", "Python", "React", "Node.js", "AWS", "Docker"],
      soft: ["Leadership", "Project Management", "Problem Solving"],
      languages: [{ id: "lang-1", language: "English", proficiency: "Native" }],
    },
    certifications: [
      {
        id: "cert-1",
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2023-03-01",
        expiry_date: "2026-03-01",
      },
    ],
  },
};

// Executive Template
const executiveTemplate: CVTemplate = {
  id: "executive",
  name: "Executive Template",
  description: "Designed for senior executives and leadership positions",
  sections: [
    "Professional Summary",
    "Work Experience",
    "Leadership Roles",
    "Education",
  ],
  sampleData: {
    personal_info: {
      full_name: "Your Full Name",
      email: "your.email@company.com",
      phone: "(555) 123-4567",
      location: "City, State",
      linkedin_url: "https://linkedin.com/in/yourprofile",
      website_url: "https://yourportfolio.com",
    },
    professional_summary: {
      content:
        "Visionary executive with 15+ years of experience driving organizational growth and transformation. Proven track record of building high-performing teams and delivering strategic initiatives that generate significant business value.",
      keywords: [
        "Strategic Leadership",
        "Organizational Growth",
        "Team Building",
        "Business Transformation",
      ],
    },
    work_experience: [
      {
        id: "work-1",
        company: "Current Company",
        position: "Chief Technology Officer",
        location: "City, State",
        start_date: "2020-01-01",
        end_date: "",
        current: true,
        description:
          "Lead technology strategy and digital transformation initiatives across the organization",
        achievements: [
          "Led digital transformation resulting in 50% efficiency gains",
          "Built and scaled engineering team from 20 to 100+ members",
          "Implemented agile methodologies across all product teams",
        ],
        technologies: [
          "Strategic Planning",
          "Team Leadership",
          "Digital Transformation",
        ],
      },
      {
        id: "work-2",
        company: "Previous Company",
        position: "VP of Engineering",
        location: "City, State",
        start_date: "2018-03-01",
        end_date: "2019-12-01",
        current: false,
        description: "Oversaw engineering operations and product development",
        achievements: [
          "Reduced time-to-market by 30% through process optimization",
          "Mentored 15+ engineering managers and directors",
        ],
        technologies: [
          "Engineering Management",
          "Product Strategy",
          "Team Development",
        ],
      },
    ],
    skills: {
      technical: [
        "Strategic Planning",
        "Team Leadership",
        "Digital Transformation",
        "Product Strategy",
      ],
      soft: [
        "Executive Communication",
        "Change Management",
        "Stakeholder Management",
      ],
      languages: [{ id: "lang-1", language: "English", proficiency: "Native" }],
    },
    education: [
      {
        id: "edu-1",
        institution: "Business School",
        degree: "Master of Business Administration",
        field_of_study: "Technology Management",
        start_date: "2015-09-01",
        end_date: "2017-05-01",
        current: false,
        honors: ["Magna Cum Laude"],
      },
    ],
  },
};

// Export all templates
export const CV_TEMPLATES: CVTemplate[] = [
  studentTemplate,
  professionalTemplate,
  executiveTemplate,
];

// Export individual templates for specific use cases
export { studentTemplate, professionalTemplate, executiveTemplate };
