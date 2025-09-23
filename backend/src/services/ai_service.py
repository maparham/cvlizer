"""
AI service for CV parsing and content generation using OpenAI.

This module provides functions for parsing CV content with OpenAI
and generating AI-enhanced CV sections tailored to job descriptions.
"""
import openai
import os
import time
from typing import Dict, Any
from dotenv import load_dotenv
from ..constants import DEFAULT_PARSED_CV
from copy import deepcopy

load_dotenv()

# Set OpenAI API key and create a singleton client
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key and openai_api_key != "your-openai-key-here":
    openai.api_key = openai_api_key
    _openai_client = openai.OpenAI()
else:
    _openai_client = None
    print("⚠️  OpenAI API key not configured. AI features will be disabled.")


async def generate_cv_section(cv_data: Dict[str, Any], job_description: str, section_type: str = "why_good_fit") -> Dict[str, Any]:
    """Generate AI-enhanced CV section based on job description"""
    
    if not _openai_client:
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "section_content": "",
            "suggestions": []
        }
    
    # Create prompt based on section type
    if section_type == "why_good_fit":
        prompt = f"""
        Based on the following CV data and job description, generate a compelling "Why I'm a Good Fit" section that highlights how the candidate's experience and skills align with the job requirements.

        CV Data:
        {cv_data}

        Job Description:
        {job_description}

        Please generate a professional, concise section (2-3 paragraphs) that:
        1. Highlights relevant experience and skills
        2. Shows understanding of the role requirements
        3. Demonstrates value proposition
        4. Uses specific examples from the CV

        Format the response as JSON with the following structure:
        {{
            "title": "Why I'm a Good Fit",
            "content": "Your generated content here...",
            "key_points": ["Point 1", "Point 2", "Point 3"]
        }}
        """
    else:
        prompt = f"""
        Based on the following CV data and job description, generate a {section_type} section.

        CV Data:
        {cv_data}

        Job Description:
        {job_description}

        Please generate a professional section that aligns with the job requirements.
        """
    
    try:
        start_time = time.time()
        
        response = _openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional CV optimization expert. Generate compelling, tailored content that helps candidates stand out."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        generation_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
        
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        # Try to parse as JSON, fallback to plain text
        try:
            import json
            parsed_content = json.loads(content)
        except json.JSONDecodeError:
            parsed_content = {
                "title": "AI Generated Section",
                "content": content,
                "key_points": []
            }
        
        return {
            "section_content": parsed_content.get("content", content),
            "title": parsed_content.get("title", "AI Generated Section"),
            "key_points": parsed_content.get("key_points", []),
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": "gpt-4o-mini"
        }
        
    except Exception as e:
        # Fallback response in case of API error
        return {
            "section_content": f"I apologize, but I'm unable to generate content at the moment. Please try again later. Error: {str(e)}",
            "title": "AI Generated Section",
            "key_points": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": "gpt-4o-mini",
            "error": str(e)
        }


def parse_cv_text_with_openai(text_content: str) -> dict:
    """Parse CV text content using OpenAI to extract structured data"""
    
    # Check if text content is empty or too short
    if not text_content or len(text_content.strip()) < 10:
        # Return error structure instead of fake data
        return {
            "error": "Unable to extract text from PDF. Please upload a PDF with selectable text.",
            "personal_info": {"full_name": "", "email": "", "phone": "", "location": "", "linkedin_url": "", "website_url": "", "github_url": ""},
            "professional_summary": {"content": "", "keywords": []},
            "work_experience": [],
            "education": [],
            "skills": {"technical": [], "soft": [], "languages": []},
            "certifications": [],
            "projects": [],
            "awards": [],
            "publications": [],
            "volunteer_experience": []
        }
    
    prompt = f"""
    Parse the following CV text and map the content to our predefined CV sections. You must organize the CV content into ONLY these standard section names:

    **REQUIRED SECTIONS TO MAP TO:**
    1. personal_info - Contact details, name, email, phone, location, social links
    2. professional_summary - Career summary, objective, profile statement
    3. work_experience - Employment history, jobs, positions held
    4. education - Academic background, degrees, schools, universities
    5. skills - Technical skills, soft skills, languages, competencies
    6. certifications - Professional certifications, licenses, credentials
    7. projects - Personal projects, portfolio items, side projects
    8. awards - Honors, recognition, achievements, prizes
    9. publications - Research papers, articles, books, publications
    10. volunteer_experience - Volunteer work, community service, nonprofit activities

    **MAPPING INSTRUCTIONS:**
    - Map ALL content from the CV to these predefined sections
    - If content doesn't fit standard sections, choose the most appropriate one
    - Do NOT create custom section names - use only the 10 predefined sections above
    - If a section has no content, omit it from the JSON response
    - Group similar content together (e.g., all certifications go in "certifications")

    Return a JSON object with this exact structure (omit sections with no content):

    {{
        "personal_info": {{
            "full_name": "string",
            "email": "string",
            "phone": "string",
            "location": "string",
            "linkedin_url": "string",
            "website_url": "string",
            "github_url": "string"
        }},
        "professional_summary": {{
            "content": "string",
            "keywords": ["string1", "string2"]
        }},
        "work_experience": [
            {{
                "company": "string",
                "position": "string",
                "start_date": "YYYY-MM-DD",
                "end_date": "YYYY-MM-DD or null",
                "current": boolean,
                "description": "string",
                "achievements": ["string1", "string2"],
                "technologies": ["string1", "string2"]
            }}
        ],
        "education": [
            {{
                "institution": "string",
                "degree": "string",
                "field_of_study": "string",
                "start_date": "YYYY-MM-DD",
                "end_date": "YYYY-MM-DD or null",
                "gpa": "string or null",
                "description": "string",
                "achievements": ["string1", "string2"],
                "honors": ["string1", "string2"]
            }}
        ],
        "skills": {{
            "technical": ["string1", "string2"],
            "soft": ["string1", "string2"],
            "languages": [
                {{"language": "string", "proficiency": "string"}}
            ]
        }},
        "certifications": [
            {{
                "name": "string",
                "issuer": "string",
                "date": "YYYY-MM-DD",
                "expiry_date": "YYYY-MM-DD or null",
                "description": "string"
            }}
        ],
        "projects": [
            {{
                "name": "string",
                "description": "string",
                "technologies": ["string1", "string2"],
                "url": "string or null"
            }}
        ],
        "awards": [
            {{
                "name": "string",
                "issuer": "string",
                "date": "YYYY-MM-DD",
                "description": "string"
            }}
        ],
        "publications": [
            {{
                "title": "string",
                "authors": "string",
                "journal": "string",
                "date": "YYYY-MM-DD",
                "url": "string or null"
            }}
        ],
        "volunteer_experience": [
            {{
                "organization": "string",
                "role": "string",
                "start_date": "YYYY-MM-DD",
                "end_date": "YYYY-MM-DD or null",
                "description": "string"
            }}
        ]
    }}

    CV Text:
    {text_content}

    IMPORTANT: Only include sections that have content. Do not create empty sections or custom section names.
    """
    
    try:
        response = _openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert CV parser. Extract structured information from CV text and return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.1
        )
        
        content = response.choices[0].message.content
        
        # Clean up markdown code blocks if present
        if content.startswith('```json'):
            content = content[7:]  # Remove ```json
        if content.startswith('```'):
            content = content[3:]   # Remove ```
        if content.endswith('```'):
            content = content[:-3]  # Remove trailing ```
        content = content.strip()
        
        # Try to parse as JSON
        import json
        try:
            parsed_content = json.loads(content)
            return parsed_content
        except json.JSONDecodeError:
            # If JSON parsing fails, return a basic structure
            fallback = deepcopy(DEFAULT_PARSED_CV)
            # Inject a summary with raw text if available
            content_preview = text_content[:500] + "..." if len(text_content) > 500 else text_content
            fallback["professional_summary"] = {"content": content_preview, "keywords": []}
            fallback["parse_error"] = "Failed to parse as JSON, using raw text"
            return fallback
        
    except Exception as e:
        # Fallback response in case of API error
        fallback = deepcopy(DEFAULT_PARSED_CV)
        content_preview = text_content[:500] + "..." if len(text_content) > 500 else text_content
        fallback["professional_summary"] = {"content": content_preview, "keywords": []}
        fallback["parse_error"] = f"OpenAI API error: {str(e)}"
        return fallback
