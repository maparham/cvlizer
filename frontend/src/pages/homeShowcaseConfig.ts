/**
 * Home showcase step configuration.
 * Step copy and asset paths for the home page "How it works" section.
 * Used only by home page components.
 */

export interface HomeShowcaseStep {
  label: string;
  title: string;
  body: string;
  bullets?: string[];
  imagePath: string;
}

export const HOME_SHOWCASE_STEPS: HomeShowcaseStep[] = [
  {
    label: "STEP 01",
    title: "Import your existing CV",
    body:
      "Upload your existing PDF or DOCX and we’ll convert it into clean, structured content you can actually edit.",
    bullets: [
      "Smart parsing: automatically detects sections like Experience, Education, and Skills.",
      "Clean structure: turns messy layouts into tidy, editable blocks.",
      "Safe uploads: files are processed securely and stay private to your account.",
    ],
    imagePath: "/home-showcase/slide-1-import.png",
  },
  {
    label: "STEP 02",
    title: "Smart editing",
    body:
      "Use the inline editor to refine every section with AI-backed suggestions while keeping your own voice.",
    bullets: [
      "AI proofread: fixes spelling, grammar, and awkward phrasing in one click.",
      "Inline suggestions: apply improvements per sentence or per section, not all at once.",
      "Stronger storytelling: helps split long paragraphs and highlight impact with focused bullets.",
    ],
    imagePath: "/home-showcase/slide-2-editing.png",
  },
  {
    label: "STEP 03",
    title: "Job-tailored Enhancements",
    body:
      "Paste in a job description and let the AI tailor your CV to match what hiring managers and ATS filters are looking for.",
    bullets: [
      "Job-specific rewrites: adapts your bullets and summary for each role.",
      "ATS alignment: surfaces missing keywords and optimizes phrasing for screening tools.",
      "Match insights: highlights strengths, gaps, and sections that deserve stronger emphasis.",
    ],
    imagePath: "/home-showcase/slide-3-enhancement.png",
  },
  {
    label: "STEP 04",
    title: "Export your CV as PDF",
    body:
      "Download your tailored CV as a polished PDF ready to send. One click and you’re done.",
    bullets: [
      "Single PDF: one clean file with your chosen layout and content.",
      "Print-ready: formatted for A4/Letter and professional appearance.",
      "Re-export anytime: update content and download again whenever you need.",
    ],
    imagePath: "/home-showcase/michael-peterson-cv.pdf",
  },
];
