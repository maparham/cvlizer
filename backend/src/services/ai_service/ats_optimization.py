"""
ATS optimization service for keyword analysis and CV improvement suggestions.

This module provides functions for analyzing CVs against job descriptions
to optimize for Applicant Tracking Systems (ATS), including keyword matching,
skill suggestions, and content optimization recommendations.
"""
import time
import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from src.config import AIConfig
from .common import (
    get_openai_client,
    is_ai_enabled,
    extract_response_data,
    parse_json_from_markdown,
    log_ai_usage_safe,
    with_retries,
    ATSOptimizationResult,
    RETRY_ATTEMPTS,
    RETRY_DELAY
)

logger = logging.getLogger(__name__)


# ============================================================================
# ATS Optimization Functions
# ============================================================================

def _build_ats_prompt(cv_data: Dict[str, Any], job_description: str) -> str:
    """
    Build the prompt for ATS optimization analysis.
    
    Args:
        cv_data: Structured CV data
        job_description: Job description text
    
    Returns:
        Formatted prompt string
    """
    return f"""
    Analyze CV content for ATS keyword optimization against job description.

    CV Data:
    {json.dumps(cv_data, indent=2)}

    Job Description:
    {job_description}

    IMPORTANT: If the job description is incomplete, missing, or contains placeholder text (like "Unknown", "N/A", empty, or very short content), you MUST:
    1. Set ats_score to 0
    2. Return empty arrays for missing_keywords and content_optimization
    3. Include a clear warning in suggestions about incomplete job description
    4. Explain that keyword analysis cannot be performed without proper job description

    CRITICAL INSTRUCTIONS:
    - ONLY analyze keywords that actually appear in the job description text above
    - Do NOT invent or assume keywords that are not explicitly mentioned
    - Extract actual words/phrases from the job description, not related concepts
    - If job description is short, only analyze the words that are actually there
    - THOROUGHLY check if each keyword already exists in the CV content before marking it as "missing"
    - Search through ALL CV sections: skills.technical, skills.soft, work_experience descriptions, professional_summary, projects, etc.
    - Pay special attention to skills.technical and skills.soft arrays - these are common places for keywords
    - Only mark keywords as "missing" if they are genuinely not found anywhere in the CV content
    - For each keyword, specify where it was found in CV (if present) or mark as truly missing
    - Be case-insensitive when checking for keywords (Python = python = PYTHON)

    KEYWORD PLACEMENT RULES:
    - For technical skills/tools: suggest adding to skills section
    - For industry/domain keywords: suggest adding to skills section as industry knowledge
    - For job titles/roles: suggest integrating into work experience descriptions naturally
    - For soft skills: suggest adding to skills section
    - For specific technologies: suggest adding to skills section
    - For company names: suggest integrating into work experience descriptions naturally
    - For location keywords: suggest integrating into work experience descriptions naturally

    CRITICAL: AVOID DUPLICATION
    - Each keyword should appear in ONLY ONE of the following: missing_keywords, suggestions, or content_optimization
    - Do NOT create duplicate suggestions for the same keyword
    - missing_keywords array should contain the primary keyword analysis
    - suggestions array should contain general improvement suggestions (not keyword-specific)
    - content_optimization should contain section-specific improvements (not keyword-specific)

    ATS Score measures keyword matching and content optimization (not formatting - that happens during PDF export).

    Return JSON:
    {{
        "ats_score": 75,
        "missing_keywords": [
            {{
                "keyword": "ACTUAL_KEYWORD_FROM_JD",
                "importance": "high",
                "frequency_in_jd": 1,
                "present_in_cv": false,
                "found_in_sections": [],
                "suggested_placement": "skills section"
            }}
        ],
        "keyword_analysis": {{
            "ACTUAL_KEYWORD": {{
                "present": false, 
                "found_in_sections": [],
                "suggested_sections": ["skills"]
            }}
        }},
        "suggestions": [
            "Enhance technical skills section with industry-specific keywords",
            "Improve work experience descriptions with relevant terminology"
        ],
        "content_optimization": [
            {{
                "section": "professional_summary",
                "missing_keywords": ["ACTUAL_KEYWORD"],
                "suggestion": "Add industry-specific keywords to professional summary"
            }}
        ],
        "strengths": [
            "Good technical keywords in work experience",
            "Relevant project descriptions"
        ],
        "weaknesses": [
            "Missing key technical skills from job description",
            "Could benefit from more industry-specific terminology"
        ]
    }}

    Focus on:
    1. Keyword matching between CV content and job description
    2. Missing important keywords and where to add them (ONLY from actual JD text, ONLY if truly missing)
    3. Thoroughly search CV content for each keyword before marking as missing
    4. Industry-specific terminology usage (ONLY if mentioned in JD)
    5. Content completeness and organization
    6. Contextually appropriate keyword placement within available sections
    7. CRITICAL: Avoid duplication - each keyword should appear in only ONE response array
    """
    

def _parse_ats_response(content: str, tokens_used: int, generation_time: int) -> ATSOptimizationResult:
    """
    Parse and validate ATS optimization response.
    
    Args:
        content: Raw response content from AI
        tokens_used: Total tokens used in generation
        generation_time: Time taken for generation in milliseconds
        
    Returns:
        Parsed and validated ATS optimization result
    """
    # Parse JSON response - handle markdown code blocks
    try:
        json_content = parse_json_from_markdown(content)
        analysis = json.loads(json_content)
    except json.JSONDecodeError as e:
        # Log the error for debugging
        logger.error(f"Failed to parse ATS analysis JSON: {str(e)}")
        logger.error(f"Raw content: {content[:500]}...")
        # Fallback if JSON parsing fails
        analysis = {
            "ats_score": 50,
            "missing_keywords": [],
            "keyword_analysis": {},
            "suggestions": ["Unable to parse detailed analysis"],
            "content_optimization": [],
            "strengths": [],
            "weaknesses": []
        }
    
    return {
        "ats_score": analysis.get("ats_score", 50),
        "missing_keywords": analysis.get("missing_keywords", []),
        "keyword_analysis": analysis.get("keyword_analysis", {}),
        "suggestions": analysis.get("suggestions", []),
        "content_optimization": analysis.get("content_optimization", []),
        "strengths": analysis.get("strengths", []),
        "weaknesses": analysis.get("weaknesses", []),
        "tokens_used": tokens_used,
        "generation_time": generation_time,
        "model_used": AIConfig.OPENAI_MODEL
    }


async def analyze_ats_optimization(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
) -> ATSOptimizationResult:
    """
    Analyze CV for ATS optimization against job description.
    
    This function performs comprehensive ATS keyword analysis, identifying
    missing keywords, analyzing keyword density, and providing optimization
    suggestions for improving ATS compatibility.
    
    Args:
        cv_data: Structured CV data
        job_description: Job description text
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging
        
    Returns:
        ATS optimization result containing:
        - ats_score: Overall ATS compatibility score (0-100)
        - missing_keywords: List of important keywords missing from CV
        - keyword_analysis: Detailed keyword presence analysis
        - content_optimization: Section-specific optimization suggestions
        - suggestions: General improvement suggestions
        - strengths: CV strengths for ATS
        - weaknesses: Areas needing improvement
        - tokens_used: AI tokens consumed
        - generation_time: Time taken in milliseconds
        - model_used: AI model identifier
    """
    if not is_ai_enabled():
        return {
            "ats_score": 0,
            "missing_keywords": [],
            "keyword_analysis": {},
            "suggestions": ["AI features are disabled. Cannot perform ATS analysis."],
            "content_optimization": [],
            "strengths": [],
            "weaknesses": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL
        }
    
    prompt = _build_ats_prompt(cv_data, job_description)
    client = get_openai_client()
    
    try:
        start_time = time.time()
        
        # Log metadata only (not full content)
        logger.info(f"Analyzing ATS optimization - user_id={user_id}, cv_id={cv_id}, operation=analyze_ats")
        
        # Call OpenAI API with ATS analysis prompt
        async def _call():
            return await asyncio.to_thread(
                client.responses.create,
                model=AIConfig.OPENAI_MODEL,
                instructions="You are an ATS (Applicant Tracking System) analysis expert. Analyze CVs against job descriptions for keyword optimization. Be thorough in checking CV content before marking keywords as missing. Extract ONLY keywords that actually appear in the job description. Return valid JSON only.",
                input=prompt,
                reasoning={"effort": "minimal", "summary": "auto"},
            )
        
        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)
        
        generation_time = int((time.time() - start_time) * 1000)
        
        # Extract content and token usage
        raw_response, prompt_tokens, completion_tokens = extract_response_data(response)
        tokens_used = prompt_tokens + completion_tokens
        
        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_ats",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Log response metrics for monitoring
        logger.info(f"ATS analysis complete - tokens={tokens_used}, time={generation_time}ms")
        
        return _parse_ats_response(raw_response, tokens_used, generation_time)
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_ats",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        # Log error and return fallback result
        logger.error(f"Error in analyze_ats_optimization: {str(e)}")
        return {
            "ats_score": 0,
            "missing_keywords": [],
            "keyword_analysis": {},
            "suggestions": [f"Error performing ATS analysis: {str(e)}"],
            "content_optimization": [],
            "strengths": [],
            "weaknesses": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL
        }


def _build_optimization_prompt(
    current_technical_skills: List[str],
    current_soft_skills: List[str],
    current_summary: str,
    work_overview_text: str,
    job_description: str
) -> str:
    """
    Build the prompt for optimization suggestions.
    
    Args:
        current_technical_skills: List of current technical skills
        current_soft_skills: List of current soft skills
        current_summary: Current professional summary text
        work_overview_text: Brief overview of work experience
        job_description: Job description text
        
    Returns:
        Formatted prompt string
    """
    return f"""Analyze CV against job description and provide improvement suggestions.

CV DATA:
Technical Skills: {json.dumps(current_technical_skills)}
Soft Skills: {json.dumps(current_soft_skills)}
Professional Summary: {current_summary}
Work Experience: {work_overview_text}

JOB DESCRIPTION:
{job_description}

TASKS:
1. SKILLS: Suggest missing technical (max 10) and soft (max 5) skills from job description
   - Only actual skills/tools/technologies/methodologies
   - Case-insensitive check against current skills (no duplicates)
   - One-sentence reasoning per skill

2. PROFESSIONAL SUMMARY: Provide ONE improved rewrite (2-4 sentences)
   - Focus on candidate's experience relevant to job description
   - Natural professional prose, factual and positive

RETURN JSON:
{{
  "skills": {{
    "technical": [{{"skill": "Python", "reasoning": "Required in job description"}}],
    "soft": [{{"skill": "Leadership", "reasoning": "Key responsibility listed"}}]
  }},
  "professional_summary": {{
    "suggested_text": "Improved summary here...",
    "original_text": "{current_summary}",
    "key_changes": ["Added Python expertise", "Emphasized leadership"]
  }}
}}"""


def _validate_skill_suggestions(
    raw_suggestions: List[Dict[str, Any]],
    current_skills: List[str]
) -> List[Dict[str, str]]:
    """
    Validate and filter skill suggestions.
    
    Args:
        raw_suggestions: Raw skill suggestions from AI
        current_skills: List of current skills (for deduplication)
        
    Returns:
        Validated list of skill suggestions
    """
    validated = []
    
    for suggestion in raw_suggestions:
        skill = suggestion.get("skill", "").strip()
        reasoning = suggestion.get("reasoning", "").strip()
        
        # Validate skill
        if not skill or len(skill) < 2 or len(skill) > 50:
            continue
        
        # Case-insensitive deduplication check
        skill_lower = skill.lower()
        if any(existing.lower() == skill_lower for existing in current_skills):
            continue
        
        validated.append({
            "skill": skill,
            "reasoning": reasoning
        })
    
    return validated


async def create_optimization_suggestions(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Generate AI suggestions for CV optimization in one unified call.
    
    Args:
        cv_data: Complete CV data including skills, professional summary, work experience
        job_description: The job description text to analyze
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging
    
    Returns:
        Dictionary with all suggestions:
        {
            "skills": {
                "technical": [{"skill": "...", "reasoning": "..."}],
                "soft": [{"skill": "...", "reasoning": "..."}]
            },
            "professional_summary": {
                "suggested_text": "...",
                "original_text": "...",
                "key_changes": ["..."]
            }
        }
        Returns empty structures if AI is disabled or on error (graceful degradation).
    """
    if not is_ai_enabled():
        return {
            "skills": {"technical": [], "soft": []},
            "professional_summary": {
                "suggested_text": "",
                "original_text": "",
                "key_changes": []
            }
        }
    
    # Extract current CV data
    skills_data = cv_data.get("skills", {})
    current_technical_skills = skills_data.get("technical", [])
    current_soft_skills = skills_data.get("soft", [])
    current_summary = cv_data.get("professional_summary", {}).get("content", "")
    
    # Create brief work experience overview
    work_experience = cv_data.get("work_experience", [])
    work_overview = []
    for job in work_experience[:3]:  # Limit to 3 most recent
        title = job.get("position", "")
        company = job.get("company", "")
        if title and company:
            work_overview.append(f"{title} at {company}")
    
    work_overview_text = "; ".join(work_overview) if work_overview else "No work experience listed"
    
    # Build prompt
    prompt = _build_optimization_prompt(
        current_technical_skills,
        current_soft_skills,
        current_summary,
        work_overview_text,
        job_description
    )
    
    try:
        start_time = time.time()
        
        # Log metadata only (not full content)
        logger.info(f"Generating AI suggestions - user_id={user_id}, cv_id={cv_id}, operation=generate_suggestions")
        
        client = get_openai_client()
        
        # Call OpenAI API with unified prompt
        async def _call():
            return await asyncio.to_thread(
                client.responses.create,
                model=AIConfig.OPENAI_MODEL,
                instructions="You are a CV optimization assistant. Analyze CVs against job descriptions and provide comprehensive improvement suggestions. Extract only real, tangible skills and create natural professional content.",
                input=prompt,
                reasoning={"effort": "minimal", "summary": "auto"},
            )
        
        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)
        
        generation_time = int((time.time() - start_time) * 1000)
        
        # Extract content and token usage
        raw_response, prompt_tokens, completion_tokens = extract_response_data(response)
        tokens_used = prompt_tokens + completion_tokens
        
        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_suggestions",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Log response metrics for monitoring
        logger.info(f"AI suggestions complete - tokens={tokens_used}, time={generation_time}ms")
        
        # Parse JSON response - handle markdown code blocks
        try:
            json_content = parse_json_from_markdown(raw_response)
            parsed_suggestions = json.loads(json_content)
            
            # Validate and filter skill suggestions
            raw_technical = parsed_suggestions.get("skills", {}).get("technical", [])
            raw_soft = parsed_suggestions.get("skills", {}).get("soft", [])
            
            technical_suggestions = _validate_skill_suggestions(raw_technical, current_technical_skills)
            soft_suggestions = _validate_skill_suggestions(raw_soft, current_soft_skills)
            
            # Process professional summary suggestion
            summary_data = parsed_suggestions.get("professional_summary", {})
            suggested_text = summary_data.get("suggested_text", "").strip()
            key_changes = summary_data.get("key_changes", [])
            
            logger.info(f"Processed AI suggestions - Technical: {len(technical_suggestions)}, Soft: {len(soft_suggestions)}")
            
            # Validate summary suggestion
            if not suggested_text or len(suggested_text) < 10:
                suggested_text = ""
                key_changes = []
            
            return {
                "skills": {
                    "technical": technical_suggestions,
                    "soft": soft_suggestions
                },
                "professional_summary": {
                    "suggested_text": suggested_text,
                    "original_text": current_summary,
                    "key_changes": key_changes
                }
            }
            
        except json.JSONDecodeError as e:
            # JSON parsing failed - return empty structures
            logger.error(f"Failed to parse AI response JSON: {str(e)}")
            return {
                "skills": {"technical": [], "soft": []},
                "professional_summary": {
                    "suggested_text": "",
                    "original_text": current_summary,
                    "key_changes": []
                }
            }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_suggestions",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        # Log error and return empty structures (graceful degradation)
        logger.error(f"Error in create_optimization_suggestions: {str(e)}")
        return {
            "skills": {"technical": [], "soft": []},
            "professional_summary": {
                "suggested_text": "",
                "original_text": current_summary,
                "key_changes": []
            }
        }

