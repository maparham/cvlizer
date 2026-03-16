/**
 * Home showcase step configuration.
 * Step copy and asset paths for the home page "How it works" section.
 * Steps may use either a React component (interactive mock) or imagePath (image/PDF).
 */

import type { ComponentType } from "react";
import { CVParsingMock } from "../components/home/showcase/CVParsingMock";
import { ProofreadDiffMock } from "../components/home/showcase/ProofreadDiffMock";
import { CoachingDiffMock } from "../components/home/showcase/CoachingDiffMock";

export interface HomeShowcaseStep {
  label: string;
  title: string;
  body: string;
  bullets?: string[];
  /** Optional: path to image or PDF when not using a component */
  imagePath?: string;
  /** Optional: interactive mock component for slides 1–3 */
  component?: ComponentType;
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
    component: CVParsingMock,
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
    component: ProofreadDiffMock,
  },
  {
    label: "STEP 03",
    title: "Job-tailored Enhancements",
    body:
      "Paste in a job description and the AI will tailor your CV to what hiring managers look for.",
    bullets: [
      "Coaching, not just rewrites: suggests stronger wording and ideas so you can expand your content.",
      "Adapt to the job: picks up key terms from the job description and tightens your phrasing so the match is obvious.",
      "Match insights: highlights strengths, gaps, and sections that deserve stronger emphasis.",
    ],
    component: CoachingDiffMock,
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
