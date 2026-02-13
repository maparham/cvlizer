"""
Shared prompt fragments for CV quality analysis.

Used by both proofread_mode and coach_mode system prompts.
"""

# Common writing corrections template (shared between modes)
WRITING_CORRECTIONS_COMMON = (
    "- Include every spelling/grammar/punctuation error you find.\n"
    "- Check all sections in the CV DATA (e.g. personal_info, professional_summary, work_experience, education, skills). Use field_path and item_id for placement; for personal_info use item_id: personal_info.\n"
    "- Do not add periods to fragment-style bullets if they already do not end with periods.\n"
    '- Return: field_corrections: [{"field_name":"position", "html_diff":"<del>Dev</del><ins>Developer</ins>", '
    '"reasoning":"(max 30 words)"}].\n'
    "- Do not include a field_correction if there is no error for the respective field.\n"
    "- Escape HTML: &amp;, &lt;, &gt;, &quot;, &#39;.\n"
    "- MINIMALITY RULE: html_diff has complete new text; wrap only changed parts in <del>/<ins>. Examples:\n"
    '    - Replacement: "Unchanged text<del>Old</del><ins>New</ins>"\n'
    '    - Deletion: "text1 <del>text to remove</del> text2"\n'
    '    - Addition: "text1 <ins>text to add</ins> text2"\n'
    '    - Typo: "text <del>wiht</del><ins>with</ins> typo"\n'
    '    - Invalid: "<del>Unchanged, change</del><ins>Unchanged, changed</ins>"\n'
    '    - Valid: "Unchanged, <del>change</del><ins>changed</ins>"\n'
    "- For non-description fields (location, company, position, institution, degree etc): remove any extra wording or punctuation.\n"
)
