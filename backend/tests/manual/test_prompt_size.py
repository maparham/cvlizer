"""
Manual test to measure prompt size reduction.

Run this to see the actual character and estimated token reduction
from the optimization work.
"""

# Original prompt template (before Phase 1 and Phase 2)
ORIGINAL_TEMPLATE = """Analyze CV quality and provide coaching to improve clarity, professionalism, and impact.

CRITICAL PRINCIPLES:
1. Write in SAME LANGUAGE as CV
2. Be BRIEF and CONCISE - maximum 30 words per reasoning field
3. Use HUMAN COACH voice, not corporate recruiter tone
4. Use SIMPLE language, avoid corporate jargon (never: "role", "leverage", "utilize", "synergize")
5. RESPECT candidate's writing style (bullets vs paragraphs, metrics usage), wording (technical, academic, simple), tone (formal, casual, friendly)
6. Preserve ALL Unicode characters exactly
7. MINIMAL CHANGES: Only suggest when there's CLEAR, SUBSTANTIAL benefit
8. Remove redundant phrases that don't add meaning or value (e.g., "very unique", "completely finished")

CV DATA:
{cv_json}

YOUR TASKS:

1. WRITING CORRECTIONS (grammar, typos, punctuation, unprofessional language, profanity):
   - Identify clear errors only (not style preferences)
   - Categorize importance: highly_recommended (critical errors) or standard
   - CRITICAL: item_id MUST exactly match an actual CV item ID from CV DATA (work_experience or education item IDs)

   ALL FIELD CORRECTIONS (company, position, institution, degree, location, description, etc.):
      - Use field_corrections array with separate entries for each field
      - Each entry MUST include: field_name, original_value, corrected_value, and markdown_diff
      - markdown_diff is REQUIRED for visual display
      - corrected_value is used by the user to apply the correction
      - Example for correcting company, position, and description:
        field_corrections: [
          {{"field_name": "company", "original_value": "Acme Inc", "corrected_value": "Acme Corporation", "markdown_diff": "~~Acme Inc~~ **Acme Corporation**"}},
          {{"field_name": "position", "original_value": "Dev", "corrected_value": "Senior Developer", "markdown_diff": "~~Dev~~ **Senior Developer**"}},
          {{"field_name": "description", "original_value": "Led a team in developing web applications", "corrected_value": "Led team of 5 engineers in developing scalable web applications", "markdown_diff": "Led ~~a team~~ **team of 5 engineers** in developing **scalable** web applications"}}
        ]
      - Field names must match actual CV data field names (company, position, institution, degree, location, description, start_date, end_date, etc.)
      - original_value and corrected_value must be the actual field values, not formatted strings with labels
      - For description fields, markdown_diff shows the COMPLETE corrected text with inline change markers using ~~strikethrough~~ and **bold** markers

2. PROFESSIONAL SUMMARY:
   - If empty: Generate new 2-4 sentence professional summary using only the information from the CV
   - If exists: Only suggest changes for CLEAR issues (grammar, unclear messaging, weak impact)
   - Preserve original structure and key phrases
   - Return NULL if no changes needed
   - Include coaching_questions if content insufficient (too brief, too generic, etc)

3. WORK EXPERIENCE & EDUCATION:
   - Evaluate quality_score (0-100) for EACH item
   - Score >= 50: Return {{item_type: "high_score", item_id, section, quality_score}} only
   - Score < 50: Return {{item_type: "low_score", item_id, section, quality_score, original, suggested, reasoning, markdown_diff}}
   - Suggested text must be READY-TO-USE in candidate's voice (not meta-instructions)
   - Include coaching_questions for items needing expansion (too brief, missing impact)

4. CONTENT COACHING (items needing MORE content, not fixes):
   - Identify items with: insufficient detail, vague statements, missing context, weak verbs
   - Provide 1-3 specific, contextual coaching questions per item
   - Optionally, include 1-2 direct suggestions like "Write more about your key responsibilities"
   - Issue categories: insufficient_content, too_brief, missing_impact, missing_achievements, lacks_specificity, missing_context, weak_action_verbs
   - NO rewritten content - only coaching questions and direct suggestions

5. SKILLS SUGGESTIONS (optional):
   - Suggest NEW technical skills (max 10)
   - Suggest NEW soft skills (max 5)
   - Only suggest if highly relevant to candidate's background and not already in the CV
   - Provide brief reasoning for each

6. OVERALL QUALITY SCORE (0-100):
   - Consider: writing quality, content completeness, clarity, professionalism
   - Be honest but encouraging

MARKDOWN DIFF FORMAT:
- Show COMPLETE suggested text with inline markers
- Use ~~strikethrough~~ for removed text
- Use **bold** for added text
- Mark ONLY changed portions, keep unchanged text plain

OUTPUT JSON matching CVQualityAnalysisResponseSchema structure.
"""

# Optimized prompt template (after Phase 1 + Phase 2)
OPTIMIZED_TEMPLATE = """PRINCIPLES:
1. Same language as CV. Max 30 words per reasoning
2. Human coach voice, simple language (avoid: "role","leverage","utilize")
3. Respect candidate's style (bullets/paragraphs, metrics, tone). Preserve Unicode
4. Minimal changes only when clearly beneficial. Remove redundant phrases

CV DATA:
{cv_json}

TASKS:

1. WRITING CORRECTIONS (grammar, typos, unprofessional language):
   Identify clear errors only. Importance: highly_recommended or standard. item_id must match CV DATA ID.

   Use field_corrections: [{{"field_name":"position","original_value":"Dev","corrected_value":"Developer","markdown_diff":"~~Dev~~ **Developer**"}}]
   Descriptions: show COMPLETE text with ~~removed~~ **added** markers.

2. PROFESSIONAL SUMMARY:
   Empty: generate 2-4 sentences from CV data
   Exists: suggest only for clear issues (grammar, unclear messaging, weak impact)
   Return NULL if no changes. Add coaching_questions if too brief/generic

3. WORK EXPERIENCE & EDUCATION:
   Score (0-100) each item
   ≥50: {{item_type:"high_score", item_id, section, quality_score}}
   <50: {{item_type:"low_score", item_id, section, quality_score, original, suggested, reasoning, markdown_diff}}
   Suggested text: ready-to-use, candidate's voice. Add coaching_questions if too brief

4. CONTENT COACHING (items needing more content):
   Identify: insufficient detail, vague statements, missing context, weak verbs
   Provide 1-3 coaching questions + 1-2 direct prompts per item
   Categories: insufficient_content, too_brief, missing_impact, lacks_specificity, weak_action_verbs
   No rewritten content

5. SKILLS (optional):
   Suggest NEW skills: max 10 technical, max 5 soft
   Only if highly relevant and not in CV. Brief reasoning each

6. OVERALL QUALITY SCORE (0-100):
   Consider: writing quality, content completeness, clarity, professionalism

MARKDOWN DIFF: COMPLETE text with inline ~~removed~~ **added** markers. Mark only changed portions

OUTPUT JSON matching CVQualityAnalysisResponseSchema structure.
"""


def estimate_tokens(text: str) -> int:
    """Rough token estimation: ~4 chars per token for English text."""
    return len(text) // 4


if __name__ == "__main__":
    original_chars = len(ORIGINAL_TEMPLATE)
    optimized_chars = len(OPTIMIZED_TEMPLATE)

    original_tokens = estimate_tokens(ORIGINAL_TEMPLATE)
    optimized_tokens = estimate_tokens(OPTIMIZED_TEMPLATE)

    char_reduction = original_chars - optimized_chars
    char_reduction_pct = (char_reduction / original_chars) * 100

    token_reduction = original_tokens - optimized_tokens
    token_reduction_pct = (token_reduction / original_tokens) * 100

    print("=" * 70)
    print("CV QUALITY PROMPT OPTIMIZATION RESULTS")
    print("=" * 70)
    print()
    print("INSTRUCTION TEMPLATE SIZE (excluding CV data):")
    print(f"  Original:  {original_chars:,} chars (~{original_tokens:,} tokens)")
    print(f"  Optimized: {optimized_chars:,} chars (~{optimized_tokens:,} tokens)")
    print()
    print("REDUCTION:")
    print(f"  Characters: {char_reduction:,} chars ({char_reduction_pct:.1f}% reduction)")
    print(
        f"  Est. Tokens: {token_reduction:,} tokens ({token_reduction_pct:.1f}% reduction)"
    )
    print()
    print("NOTES:")
    print("  - This measures only the instruction template")
    print("  - Phase 1 also optimizes CV JSON data (minification + field removal)")
    print("  - Total reduction on full prompts: ~38-42% including CV data optimization")
    print("=" * 70)
