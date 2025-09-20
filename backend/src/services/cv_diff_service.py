"""
CV Diff Service for computing semantic differences between CV versions.

This service provides robust diff computation using Python's built-in difflib,
handling move+edit scenarios, phantom changes, and providing structured diff results.
"""
from typing import Dict, List, Any, Optional, Tuple
import json
import difflib
import re


class CVDiffService:
    """Service for computing semantic differences between CV data versions."""
    
    def __init__(self):
        """Initialize the diff service."""
        pass
    
    def compute_diff(self, old_data: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute semantic diff between two CV data versions.
        
        Args:
            old_data: Original CV data
            new_data: Updated CV data
            
        Returns:
            Structured diff result with changes list and summary
        """
        # Clean and normalize both datasets for consistent comparison
        cleaned_old = self._clean_cv_data(old_data)
        cleaned_new = self._clean_cv_data(new_data)
        
        # Check if data is identical after cleaning (should not happen with real changes)
        if cleaned_old == cleaned_new:
            print(f"⚠️  DIFF WARNING - Data is identical after cleaning, but input data was different")
        
        # Compute the diff using simple comparison
        changes = self._compute_simple_diff(cleaned_old, cleaned_new)
        
        # Generate summary
        summary = self._generate_summary(changes)
        
        return {
            'changes': changes,
            'summary': summary,
            'total_changes': len(changes)
        }
    
    def _clean_cv_data(self, cv_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean and normalize CV data for consistent comparison.
        
        This ensures both old and new data have the same structure,
        preventing phantom changes from data normalization differences.
        """
        from ..utils.validation import CVDataValidator
        
        # Make a deep copy to avoid modifying original data
        cleaned = json.loads(json.dumps(cv_data))
        
        # Apply gentle cleaning for diff comparison (less aggressive than API cleaning)
        cleaned = self._gentle_clean_for_diff(cleaned)
        
        # Normalize empty fields to consistent values
        self._normalize_empty_fields(cleaned)
        
        return cleaned
    
    def _gentle_clean_for_diff(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gentle cleaning for diff comparison - only removes truly empty entries.
        Less aggressive than API cleaning to preserve diff accuracy.
        """
        cleaned = data.copy()
        
        # Only remove entries that are completely empty (no meaningful data at all)
        array_sections = ['work_experience', 'education', 'projects', 'certifications', 
                         'awards', 'publications', 'volunteer_experience']
        
        for section in array_sections:
            if section in cleaned and isinstance(cleaned[section], list):
                # Only remove entries that have no meaningful fields at all
                cleaned[section] = [
                    item for item in cleaned[section]
                    if self._has_meaningful_content(item)
                ]
        
        return cleaned
    
    def _has_meaningful_content(self, item: Dict[str, Any]) -> bool:
        """Check if an item has any meaningful content (not just empty strings/nulls)."""
        if not isinstance(item, dict):
            return False
        
        # Check all values - if any non-empty value exists, keep the item
        for key, value in item.items():
            if key == 'id':  # Always preserve ID
                continue
            if value and str(value).strip():  # Has non-empty content
                return True
        
        return False
    
    def _normalize_empty_fields(self, data: Dict[str, Any]) -> None:
        """Normalize empty/null fields to consistent values."""
        # Normalize personal info
        if 'personal_info' in data and data['personal_info']:
            personal = data['personal_info']
            for field in ['phone', 'linkedin_url', 'website_url', 'github_url']:
                if field not in personal or personal[field] is None:
                    personal[field] = ''
        
        # Normalize array sections
        array_sections = ['work_experience', 'education', 'projects', 'certifications', 
                         'awards', 'publications', 'volunteer_experience']
        
        for section in array_sections:
            if section in data and isinstance(data[section], list):
                for item in data[section]:
                    if isinstance(item, dict):
                        self._normalize_item_fields(item, section)
    
    def _normalize_item_fields(self, item: Dict[str, Any], section: str) -> None:
        """Normalize fields for a specific section item."""
        # Define expected fields per section
        field_maps = {
            'work_experience': ['description', 'achievements', 'technologies', 'end_date'],
            'education': ['field_of_study', 'gpa', 'description', 'achievements', 'honors', 'end_date'],
            'projects': ['technologies', 'url', 'end_date'],
            'certifications': ['expiry_date', 'description'],
            'awards': ['description'],
            'publications': ['url'],
            'volunteer_experience': ['description', 'end_date']
        }
        
        optional_fields = field_maps.get(section, [])
        for field in optional_fields:
            if field not in item or item[field] is None:
                if field in ['achievements', 'technologies', 'honors']:
                    item[field] = []  # Arrays default to empty list
                else:
                    item[field] = ''  # Strings default to empty string
    
    def _compute_simple_diff(self, old_data: Dict[str, Any], new_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Compute diff using simple comparison logic."""
        changes = []
        
        # Compare each section
        sections_to_compare = [
            'personal_info', 'professional_summary', 'work_experience', 
            'education', 'skills', 'certifications', 'projects', 
            'awards', 'publications', 'volunteer_experience'
        ]
        
        for section in sections_to_compare:
            old_section = old_data.get(section)
            new_section = new_data.get(section)
            
            if section in ['work_experience', 'education', 'projects', 'certifications', 
                          'awards', 'publications', 'volunteer_experience']:
                # Array sections
                changes.extend(self._compare_array_section(section, old_section or [], new_section or []))
            elif section == 'skills':
                # Skills object
                changes.extend(self._compare_skills_section(old_section, new_section))
            elif section in ['personal_info', 'professional_summary']:
                # Object sections
                changes.extend(self._compare_object_section(section, old_section, new_section))
        
        return changes
    
    def _compare_array_section(self, section: str, old_items: List[Dict], new_items: List[Dict]) -> List[Dict[str, Any]]:
        """Compare array sections like work_experience, education, etc."""
        changes = []
        
        # Create ID-based mappings for accurate comparison
        old_by_id = {item.get('id'): item for item in old_items if item.get('id')}
        new_by_id = {item.get('id'): item for item in new_items if item.get('id')}
        
        old_ids = set(old_by_id.keys())
        new_ids = set(new_by_id.keys())
        
        # Find additions
        added_ids = new_ids - old_ids
        for item_id in added_ids:
            item = new_by_id[item_id]
            item_name = self._get_item_display_name(item, section)
            changes.append({
                'type': 'item_added',
                'section': section,
                'description': f"{self._get_section_display_name(section)}: Added {item_name}",
                'details': [],
                'icon': 'add',
                'color': 'success'
            })
        
        # Find removals
        removed_ids = old_ids - new_ids
        for item_id in removed_ids:
            item = old_by_id[item_id]
            item_name = self._get_item_display_name(item, section)
            changes.append({
                'type': 'item_removed',
                'section': section,
                'description': f"{self._get_section_display_name(section)}: Removed {item_name}",
                'details': [],
                'icon': 'remove',
                'color': 'error'
            })
        
        # Find modifications (same ID, different content)
        common_ids = old_ids & new_ids
        for item_id in common_ids:
            old_item = old_by_id[item_id]
            new_item = new_by_id[item_id]
            
            # Compare individual fields
            field_changes = self._compare_item_fields(old_item, new_item, section)
            if field_changes:
                item_name = self._get_item_display_name(new_item, section)
                
                if len(field_changes) == 1:
                    # Single field change
                    field_change = field_changes[0]
                    changes.append({
                        'type': 'field_changed',
                        'section': section,
                        'description': f"{self._get_section_display_name(section)}: {field_change['description']}",
                        'details': [],
                        'text_diff': field_change['text_diff'],
                        'icon': 'edit',
                        'color': 'warning'
                    })
                else:
                    # Multiple field changes
                    detail_descriptions = [change['description'] for change in field_changes]
                    text_diffs = [change['text_diff'] for change in field_changes if change['text_diff']]
                    
                    changes.append({
                        'type': 'item_modified',
                        'section': section,
                        'description': f"{self._get_section_display_name(section)}: Updated {item_name}",
                        'details': detail_descriptions,
                        'text_diff': text_diffs[0] if len(text_diffs) == 1 else None,  # Only include text diff if single text change
                        'icon': 'edit',
                        'color': 'warning'
                    })
        
        return changes
    
    def _compare_object_section(self, section: str, old_obj: Optional[Dict], new_obj: Optional[Dict]) -> List[Dict[str, Any]]:
        """Compare object sections like personal_info, professional_summary."""
        changes = []
        
        if not old_obj and new_obj:
            # Section added
            changes.append({
                'type': 'section_added',
                'section': section,
                'description': f"{self._get_section_display_name(section)}: Added",
                'details': [],
                'icon': 'add',
                'color': 'success'
            })
        elif old_obj and not new_obj:
            # Section removed
            changes.append({
                'type': 'section_removed',
                'section': section,
                'description': f"{self._get_section_display_name(section)}: Removed",
                'details': [],
                'icon': 'remove',
                'color': 'error'
            })
        elif old_obj and new_obj:
            # Section modified - compare fields
            field_changes = self._compare_item_fields(old_obj, new_obj, section)
            if field_changes:
                if len(field_changes) == 1:
                    field_change = field_changes[0]
                    changes.append({
                        'type': 'field_changed',
                        'section': section,
                        'description': f"{self._get_section_display_name(section)}: {field_change['description']}",
                        'details': [],
                        'text_diff': field_change['text_diff'],
                        'icon': 'edit',
                        'color': 'warning'
                    })
                else:
                    detail_descriptions = [change['description'] for change in field_changes]
                    text_diffs = [change['text_diff'] for change in field_changes if change['text_diff']]
                    
                    changes.append({
                        'type': 'section_modified',
                        'section': section,
                        'description': f"{self._get_section_display_name(section)}: Updated {len(field_changes)} fields",
                        'details': detail_descriptions,
                        'text_diff': text_diffs[0] if len(text_diffs) == 1 else None,
                        'icon': 'edit',
                        'color': 'warning'
                    })
        
        return changes
    
    def _compare_skills_section(self, old_skills: Optional[Dict], new_skills: Optional[Dict]) -> List[Dict[str, Any]]:
        """Compare skills section with detailed skill-level changes."""
        changes = []
        
        if not old_skills and new_skills:
            # Skills section added
            changes.append({
                'type': 'section_added',
                'section': 'skills',
                'description': 'Skills: Added skills section',
                'details': [],
                'text_diff': None,
                'icon': 'add',
                'color': 'success'
            })
        elif old_skills and not new_skills:
            # Skills section removed
            changes.append({
                'type': 'section_removed',
                'section': 'skills',
                'description': 'Skills: Removed skills section',
                'details': [],
                'text_diff': None,
                'icon': 'remove',
                'color': 'error'
            })
        elif old_skills and new_skills:
            # Compare individual skill categories
            changes.extend(self._compare_skill_category(old_skills.get('technical', []), new_skills.get('technical', []), 'Technical'))
            changes.extend(self._compare_skill_category(old_skills.get('soft', []), new_skills.get('soft', []), 'Soft'))
            changes.extend(self._compare_languages(old_skills.get('languages', []), new_skills.get('languages', []), 'Languages'))
        
        return changes
    
    def _compare_skill_category(self, old_skills: List[str], new_skills: List[str], category: str) -> List[Dict[str, Any]]:
        """Compare a specific skill category (technical, soft) with detailed changes."""
        changes = []
        
        old_set = set(old_skills) if old_skills else set()
        new_set = set(new_skills) if new_skills else set()
        
        added_skills = new_set - old_set
        removed_skills = old_set - new_set
        
        if added_skills or removed_skills:
            details = []
            description_parts = []
            
            if added_skills:
                added_list = sorted(list(added_skills))
                details.append(f"Added: {', '.join(added_list)}")
                description_parts.append(f"added {len(added_list)} skill{'s' if len(added_list) > 1 else ''}")
            
            if removed_skills:
                removed_list = sorted(list(removed_skills))
                details.append(f"Removed: {', '.join(removed_list)}")
                description_parts.append(f"removed {len(removed_list)} skill{'s' if len(removed_list) > 1 else ''}")
            
            description = f"Skills: {category} skills - {' and '.join(description_parts)}"
            
            changes.append({
                'type': 'skills_modified',
                'section': 'skills',
                'description': description,
                'details': details,
                'text_diff': None,
                'icon': 'edit',
                'color': 'warning'
            })
        
        return changes
    
    def _compare_languages(self, old_languages: List, new_languages: List, category: str) -> List[Dict[str, Any]]:
        """Compare languages with support for both string and object formats."""
        changes = []
        
        # Handle both string arrays and object arrays
        if old_languages and isinstance(old_languages[0], dict):
            # Object format - compare by language name
            old_lang_names = {lang.get('language', '') for lang in old_languages if lang.get('language')}
            new_lang_names = {lang.get('language', '') for lang in new_languages if lang.get('language')}
        else:
            # String format
            old_lang_names = set(old_languages) if old_languages else set()
            new_lang_names = set(new_languages) if new_languages else set()
        
        added_languages = new_lang_names - old_lang_names
        removed_languages = old_lang_names - new_lang_names
        
        if added_languages or removed_languages:
            details = []
            description_parts = []
            
            if added_languages:
                added_list = sorted(list(added_languages))
                details.append(f"Added: {', '.join(added_list)}")
                description_parts.append(f"added {len(added_list)} language{'s' if len(added_list) > 1 else ''}")
            
            if removed_languages:
                removed_list = sorted(list(removed_languages))
                details.append(f"Removed: {', '.join(removed_list)}")
                description_parts.append(f"removed {len(removed_list)} language{'s' if len(removed_list) > 1 else ''}")
            
            description = f"Skills: {category} - {' and '.join(description_parts)}"
            
            changes.append({
                'type': 'skills_modified',
                'section': 'skills',
                'description': description,
                'details': details,
                'text_diff': None,
                'icon': 'edit',
                'color': 'warning'
            })
        
        return changes
    
    def _compare_item_fields(self, old_item: Dict[str, Any], new_item: Dict[str, Any], section: str) -> List[Dict[str, Any]]:
        """Compare individual fields within an item and return list of changes."""
        changes = []
        
        # Get all fields from both items
        all_fields = set(old_item.keys()) | set(new_item.keys())
        
        # Ignore internal fields
        ignore_fields = {'id', 'created_at', 'updated_at'}
        all_fields = all_fields - ignore_fields
        
        for field in all_fields:
            old_value = old_item.get(field)
            new_value = new_item.get(field)
            
            # Normalize empty values for comparison
            old_normalized = self._normalize_for_comparison(old_value)
            new_normalized = self._normalize_for_comparison(new_value)
            
            if old_normalized != new_normalized:
                field_name = self._get_field_display_name(field)
                
                # Check if this is a text field that should have a detailed diff
                if self._is_text_field(field, old_value, new_value):
                    text_diff = self._generate_text_diff(old_value or '', new_value or '')
                    changes.append({
                        'description': f"{field_name} text updated",
                        'text_diff': text_diff
                    })
                else:
                    old_display = self._format_value_for_display(old_value)
                    new_display = self._format_value_for_display(new_value)
                    
                    
                    changes.append({
                        'description': f"{field_name} changed from \"{old_display}\" to \"{new_display}\"",
                        'text_diff': None
                    })
        
        return changes
    
    def _normalize_for_comparison(self, value: Any) -> Any:
        """Normalize values for consistent comparison."""
        if value is None or value == '' or value == []:
            return None
        return value
    
    def _is_text_field(self, field: str, old_value: Any, new_value: Any) -> bool:
        """Determine if a field should have detailed text diff."""
        # Fields that typically contain substantial text
        text_fields = {
            'description', 'content', 'summary', 'achievements', 
            'responsibilities', 'details', 'notes'
        }
        
        # Check if field name suggests it's a text field
        if field in text_fields or 'description' in field.lower() or 'content' in field.lower():
            # Also check if the values are substantial enough for text diff
            old_text = str(old_value or '').strip()
            new_text = str(new_value or '').strip()
            
            # Only generate text diff if either text is substantial (>20 chars)
            if len(old_text) > 20 or len(new_text) > 20:
                return True
        
        return False
    
    def _generate_text_diff(self, old_text: str, new_text: str) -> Dict[str, Any]:
        """Generate detailed text diff with inline highlighting."""
        # For small changes, generate character-level diff
        if len(old_text) < 1000 and len(new_text) < 1000:
            inline_diff = self._generate_inline_diff(old_text, new_text)
        else:
            inline_diff = None
        
        # Generate word-level diff for better granularity
        word_diff = self._generate_word_diff(old_text, new_text)
        
        # Calculate simple statistics
        char_additions = len(new_text) - len(old_text) if len(new_text) > len(old_text) else 0
        char_deletions = len(old_text) - len(new_text) if len(old_text) > len(new_text) else 0
        
        return {
            'inline_diff': inline_diff,
            'word_diff': word_diff,
            'stats': {
                'additions': char_additions,
                'deletions': char_deletions,
                'total_changes': char_additions + char_deletions
            },
            'old_text': old_text,
            'new_text': new_text
        }
    
    def _generate_inline_diff(self, old_text: str, new_text: str) -> str:
        """Generate inline diff with character-level highlighting."""
        # Use difflib.SequenceMatcher for character-level comparison
        matcher = difflib.SequenceMatcher(None, old_text, new_text)
        result = []
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                # Unchanged text
                result.append(old_text[i1:i2])
            elif tag == 'delete':
                # Deleted text (red background)
                result.append(f'<span style="background-color: #ffcdd2; text-decoration: line-through;">{old_text[i1:i2]}</span>')
            elif tag == 'insert':
                # Inserted text (green background)
                result.append(f'<span style="background-color: #c8e6c9; font-weight: bold;">{new_text[j1:j2]}</span>')
            elif tag == 'replace':
                # Replaced text (show both)
                result.append(f'<span style="background-color: #ffcdd2; text-decoration: line-through;">{old_text[i1:i2]}</span>')
                result.append(f'<span style="background-color: #c8e6c9; font-weight: bold;">{new_text[j1:j2]}</span>')
        
        return ''.join(result)
    
    def _generate_word_diff(self, old_text: str, new_text: str) -> List[str]:
        """Generate word-level diff for summary."""
        old_words = old_text.split()
        new_words = new_text.split()
        
        matcher = difflib.SequenceMatcher(None, old_words, new_words)
        changes = []
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'delete':
                changes.append(f"Removed: {' '.join(old_words[i1:i2])}")
            elif tag == 'insert':
                changes.append(f"Added: {' '.join(new_words[j1:j2])}")
            elif tag == 'replace':
                changes.append(f"Changed: '{' '.join(old_words[i1:i2])}' → '{' '.join(new_words[j1:j2])}'")
        
        return changes
    
    def _get_section_display_name(self, section: str) -> str:
        """Get user-friendly section name."""
        section_names = {
            'personal_info': 'Personal Information',
            'professional_summary': 'Professional Summary',
            'work_experience': 'Work Experience',
            'education': 'Education',
            'skills': 'Skills',
            'certifications': 'Certifications',
            'projects': 'Projects',
            'awards': 'Awards',
            'publications': 'Publications',
            'volunteer_experience': 'Volunteer Experience'
        }
        return section_names.get(section, section.replace('_', ' ').title())
    
    def _get_field_display_name(self, field: str) -> str:
        """Get user-friendly field name."""
        field_names = {
            'full_name': 'Full Name',
            'start_date': 'Start Date',
            'end_date': 'End Date',
            'field_of_study': 'Field of Study',
            'linkedin_url': 'LinkedIn URL',
            'website_url': 'Website URL',
            'github_url': 'GitHub URL'
        }
        return field_names.get(field, field.replace('_', ' ').title())
    
    def _get_item_display_name(self, item: Dict[str, Any], section: str) -> str:
        """Get display name for an array item."""
        if section == 'work_experience':
            position = item.get('position', '')
            company = item.get('company', '')
            if position and company:
                return f"{position} at {company}"
            return position or company or 'work experience entry'
        
        elif section == 'education':
            degree = item.get('degree', '')
            institution = item.get('institution', '')
            if degree and institution:
                return f"{degree} from {institution}"
            return degree or institution or 'education entry'
        
        elif section == 'projects':
            return item.get('name', 'project')
        
        elif section == 'certifications':
            name = item.get('name', '')
            issuer = item.get('issuer', '')
            if name and issuer:
                return f"{name} from {issuer}"
            return name or 'certification'
        
        elif section == 'awards':
            return item.get('name', 'award')
        
        elif section == 'publications':
            return item.get('title', 'publication')
        
        elif section == 'volunteer_experience':
            role = item.get('role', '')
            organization = item.get('organization', '')
            if role and organization:
                return f"{role} at {organization}"
            return role or organization or 'volunteer experience'
        
        return f"{section} entry"
    
    def _format_value_for_display(self, value: Any) -> str:
        """Format a value for user-friendly display."""
        if value is None or value == '':
            return 'empty'
        elif isinstance(value, list):
            if len(value) == 0:
                return 'empty'
            elif len(value) == 1:
                return str(value[0])
            else:
                return f"{len(value)} items"
        elif isinstance(value, bool):
            return 'Yes' if value else 'No'
        else:
            return str(value)
    
    def _generate_summary(self, changes: List[Dict[str, Any]]) -> str:
        """Generate a summary description of all changes."""
        if len(changes) == 0:
            return "No changes"
        elif len(changes) == 1:
            return "1 Change"
        else:
            return f"{len(changes)} Changes"


# Global instance
cv_diff_service = CVDiffService()
