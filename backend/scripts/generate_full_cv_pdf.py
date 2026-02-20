"""
Generate a full-content CV PDF to exercise all editor sections.

This script constructs a synthetic parsed CV object with data in every
supported section and uses the existing LaTeX export service to produce
LaTeX and compile it to a PDF. It saves outputs to a specified directory.

Usage (from repo root):
  python -m backend.scripts.generate_full_cv_pdf --out-dir ./uploads --template standard

Notes:
- Requires pdflatex in PATH to compile PDF; otherwise only the .tex is saved.
- The generated content includes markdown bullets to validate parser behavior.
"""

from __future__ import annotations

import argparse
import os
from datetime import datetime
from pathlib import Path

from src.services.latex_export_service import (
    generate_cv_latex,
    compile_pdf_from_latex,
    is_latex_available,
)


def _build_full_parsed_cv() -> dict:
    """Return a parsed CV dict with all sections populated.

    Designed to ensure that when the resulting PDF is parsed, the frontend
    editor recognizes and activates all sections.
    """
    return {
        "personal_info": {
            "full_name": "Alexandra Doe",
            "email": "alexandra.doe@example.com",
            "phone": "+1 (555) 123-4567",
            "location": "San Francisco, CA",
            "linkedin_url": "linkedin.com/in/alexandradoe",
            "website_url": "alexandradoe.dev",
            "github_url": "github.com/alexandradoe",
            "academic_title": "Senior Software Engineer",
        },
        "custom_sections": [
            {
                "id": "professional_summary",
                "type": "professional_summary",
                "title": "Professional Summary",
                "content": (
                    "Experienced engineer specializing in scalable web platforms and AI.\n"
                    "- 8+ years across backend, frontend, and ML ops\n"
                    "- **Leadership**: led teams of 5–10 engineers\n"
                    "- *Impact*: performance +40%, costs -25%"
                ),
            },
            {
                "id": "why_good_fit",
                "type": "cover_letter",
                "title": "Why I'm a Good Fit",
                "content": (
                    "- Domain experience in fintech and SaaS\n"
                    "- **Customer-first** delivery with measurable outcomes\n"
                    "- *Hands-on* with CI/CD, IaC, and observability"
                ),
            },
        ],
        "why_good_fit_metadata": {
            "fit_analysis": "Domain experience in fintech and SaaS.",
            "confidence_score": 85,
            "key_matches": ["Python", "FastAPI", "SaaS"],
            "job_description_id": None,
            "generated_at": "2025-01-01T12:00:00Z",
        },
        "work_experience": [
            {
                "position": "Senior Software Engineer",
                "company": "Acme Corp",
                "location": "Remote",
                "start_date": "2021-01",
                "end_date": "2024-06",
                "description": (
                    "Led the redesign of a multi-tenant platform serving millions.\n"
                    "- **Scaled** services with event-driven architecture\n"
                    "- Reduced p95 latency from 450ms to 180ms"
                ),
                "achievements": [
                    {"bullet": "Launched 0-downtime deploys via blue/green"},
                    {"bullet": "Drove security posture improvements (SAST/DAST)"},
                ],
            },
            {
                "position": "Software Engineer",
                "company": "Beta Labs",
                "location": "New York, NY",
                "start_date": "2018-06",
                "end_date": "2020-12",
                "description": (
                    "Built data pipelines and internal tools.\n"
                    "- **Optimized** ETL throughput by 2x\n"
                    "- Introduced *feature flags* for safe rollouts"
                ),
                "achievements": [
                    {"bullet": "Standardized logging and tracing"},
                    {"bullet": "Mentored 3 junior engineers"},
                ],
            },
        ],
        "education": [
            {
                "degree": "B.S.",
                "field_of_study": "Computer Science",
                "academic_title": "Summa Cum Laude",
                "institution": "Tech University",
                "location": "Boston, MA",
                "gpa": "3.9/4.0",
                "start_date": "2014",
                "end_date": "2018",
                "description": "Coursework in algorithms, distributed systems, AI.",
                "achievements": [
                    {"bullet": "Dean's List (all semesters)"},
                ],
                "honors": [
                    {"bullet": "Undergraduate Research Award"},
                ],
            }
        ],
        "skills": {
            "technical": [
                "Python",
                "FastAPI",
                "SQLAlchemy",
                "TypeScript",
                "React",
                "AWS",
            ],
            "soft": ["Leadership", "Communication", "Collaboration"],
            "languages": [
                {"language": "English", "proficiency": "Native"},
                {"language": "Spanish", "proficiency": "Professional"},
            ],
        },
        "certifications": [
            {
                "name": "AWS Solutions Architect Associate",
                "issuer": "Amazon Web Services",
                "date": "2022-05",
                "expiry_date": "2025-05",
                "description": "Validated cloud architecture and best practices.",
            }
        ],
        "projects": [
            {
                "name": "Realtime Analytics Platform",
                "description": (
                    "- **Streaming** architecture on Kafka and Flink\n"
                    "- *Self-serve* dashboards with RBAC"
                ),
                "url": "https://example.com/analytics",
                "technologies": ["Kafka", "Flink", "Debezium", "React"],
            }
        ],
        "awards": [
            {
                "name": "Engineering Excellence Award",
                "issuer": "Acme Corp",
                "date": "2023-12",
                "description": "Recognized for leadership and platform resilience work.",
            }
        ],
        "publications": [
            {
                "title": "Improving Microservice Resilience",
                "authors": "A. Doe; B. Smith",
                "journal": "Systems Journal",
                "date": "2021",
                "url": "https://example.com/paper",
            }
        ],
        "volunteer_experience": [
            {
                "role": "STEM Mentor",
                "organization": "Local Nonprofit",
                "location": "San Francisco, CA",
                "start_date": "2019",
                "end_date": "2022",
                "description": (
                    "- Mentored high school students in programming\n"
                    "- Organized **hackathons** and workshops"
                ),
            }
        ],
        # Provide a section configuration that lists all visible sections
        "section_config": {
            "sections": [
                {
                    "id": "professional_summary",
                    "type": "custom",
                    "title": "Professional Summary",
                    "visible": True,
                    "order": 0,
                },
                {
                    "id": "why_good_fit",
                    "type": "custom",
                    "title": "Why I'm a Good Fit",
                    "visible": True,
                    "order": 1,
                },
                {
                    "id": "work_experience",
                    "type": "work_experience",
                    "title": "Work Experience",
                    "visible": True,
                    "order": 2,
                },
                {
                    "id": "education",
                    "type": "education",
                    "title": "Education",
                    "visible": True,
                    "order": 3,
                },
                {
                    "id": "skills",
                    "type": "skills",
                    "title": "Skills",
                    "visible": True,
                    "order": 4,
                },
                {
                    "id": "certifications",
                    "type": "certifications",
                    "title": "Certifications",
                    "visible": True,
                    "order": 5,
                },
                {
                    "id": "projects",
                    "type": "projects",
                    "title": "Projects",
                    "visible": True,
                    "order": 6,
                },
                {
                    "id": "awards",
                    "type": "awards",
                    "title": "Awards",
                    "visible": True,
                    "order": 7,
                },
                {
                    "id": "publications",
                    "type": "publications",
                    "title": "Publications",
                    "visible": True,
                    "order": 8,
                },
                {
                    "id": "volunteer_experience",
                    "type": "volunteer_experience",
                    "title": "Volunteer Experience",
                    "visible": True,
                    "order": 9,
                },
            ]
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a full-content CV PDF")
    parser.add_argument(
        "--out-dir",
        type=str,
        default=str(Path.cwd() / "uploads"),
        help="Directory to save outputs (PDF and .tex)",
    )
    parser.add_argument(
        "--template",
        type=str,
        default="standard",
        help="Template to use (must exist: standard, traditional, spacious)",
    )
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    parsed = _build_full_parsed_cv()
    title = parsed.get("personal_info", {}).get("full_name", "CV") or "CV"
    date_str = datetime.utcnow().strftime("%Y%m%d")
    base_name = f"{title.replace(' ', '_')}_{date_str}"

    # Generate LaTeX
    tex_source = generate_cv_latex(parsed, title=title, template_name=args.template)
    tex_path = out_dir / f"{base_name}.tex"
    tex_path.write_text(tex_source, encoding="utf-8")

    # Try PDF compilation if LaTeX is available
    if is_latex_available():
        try:
            pdf_bytes = compile_pdf_from_latex(tex_source)
            pdf_path = out_dir / f"{base_name}.pdf"
            pdf_path.write_bytes(pdf_bytes)
            print(f"Generated: {pdf_path}")
        except Exception as e:
            print(f"LaTeX compile failed, .tex saved at {tex_path}: {e}")
    else:
        print(f"pdflatex not available; .tex saved at {tex_path}")


if __name__ == "__main__":
    main()
