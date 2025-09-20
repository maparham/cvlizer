"""
Validation utilities for CV data processing.

This module centralizes validation logic that was previously duplicated
across API endpoints, providing reusable functions for data cleaning
and business rule validation.
"""
from typing import List, Dict, Any


class CVDataValidator:
    """Centralized validation utilities for CV data."""
    
    @staticmethod
    def safe_get_str(data: Dict[str, Any], key: str, default: str = '') -> str:
        """Safely get string value from dictionary with fallback."""
        value = data.get(key, default)
        return value.strip() if value is not None else ''
    
    @staticmethod
    def safe_get_list(data: Dict[str, Any], key: str, default: List[Any] = None) -> List[Any]:
        """Safely get list value from dictionary with fallback."""
        if default is None:
            default = []
        value = data.get(key, default)
        return value if value is not None else []
    
    @staticmethod
    def validate_date_order(start_date: str, end_date: str, item_name: str, item_index: int) -> str:
        """Validate that start_date is before end_date. Returns error message if invalid, empty string if valid."""
        if not start_date or not end_date:
            return ''  # Skip validation if either date is missing (handled by required field validation)
        
        try:
            from datetime import datetime
            # Parse dates - only support YYYY-MM-DD format
            start_parsed = datetime.strptime(start_date, '%Y-%m-%d')
            end_parsed = datetime.strptime(end_date, '%Y-%m-%d')
            
            if start_parsed >= end_parsed:
                return f"{item_name} #{item_index}: Start date must be before end date"
                
        except Exception:
            # If date parsing fails, skip validation (invalid date format will be caught elsewhere)
            pass
        
        return ''
    
    @classmethod
    def clean_empty_entries(cls, cv_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove completely empty entries from arrays to prevent validation issues.
        """
        cleaned_data = cv_data.copy()
        
        # Clean work experience entries - only keep entries that have all required fields
        if 'work_experience' in cleaned_data:
            cleaned_data['work_experience'] = [
                exp for exp in cleaned_data['work_experience']
                if all([
                    cls.safe_get_str(exp, 'position'),
                    cls.safe_get_str(exp, 'company'),
                    cls.safe_get_str(exp, 'start_date')
                ])
            ]
        
        # Clean education entries - only keep entries that have all required fields
        if 'education' in cleaned_data:
            cleaned_data['education'] = [
                edu for edu in cleaned_data['education']
                if all([
                    cls.safe_get_str(edu, 'institution'),
                    cls.safe_get_str(edu, 'degree'),
                    cls.safe_get_str(edu, 'start_date')
                ])
            ]
        
        return cleaned_data
    
    @classmethod
    def validate_business_rules(cls, cv_data: Dict[str, Any]) -> List[str]:
        """
        Validate CV data against business rules.
        
        This function implements the mandatory field requirements:
        - Personal Info: full_name, email, location are mandatory
        - Professional Summary: content is mandatory when present
        - Work Experience: position, company, start_date are mandatory (only when work_experience array has items)
        - Education: institution, degree, start_date are mandatory (only when education array has items)
        - Skills: at least one skill (technical or soft) is required when skills section exists
        - Projects: name and description are mandatory when projects array has items
        - Awards: name, issuer, date are mandatory when awards array has items
        - Certifications: name, issuer, date are mandatory when certifications array has items
        - Publications: title, authors, journal, date are mandatory when publications array has items
        - Volunteer Experience: organization, role, start_date are mandatory when volunteer_experience array has items
        
        Note: This validation assumes the data has already been cleaned of empty entries.
        """
        errors = []
        
        # Validate Personal Information
        personal_info = cv_data.get('personal_info', {})
        if personal_info:
            if not cls.safe_get_str(personal_info, 'full_name'):
                errors.append("Personal Information: Full name is required")
            if not cls.safe_get_str(personal_info, 'email'):
                errors.append("Personal Information: Email is required")
            if not cls.safe_get_str(personal_info, 'location'):
                errors.append("Personal Information: Location is required")
        
        # Validate Professional Summary
        professional_summary = cv_data.get('professional_summary', {})
        if professional_summary and not cls.safe_get_str(professional_summary, 'content'):
            errors.append("Professional Summary: Content is required")
        
        # Validate Skills - at least one skill required when skills section exists
        skills = cv_data.get('skills', {})
        if skills:
            technical_skills = cls.safe_get_list(skills, 'technical')
            soft_skills = cls.safe_get_list(skills, 'soft')
            if not technical_skills and not soft_skills:
                errors.append("Skills: At least one skill (technical or soft) is required")
        
        # Validate Work Experience - all entries should have required fields since empty ones are filtered out
        work_experience = cv_data.get('work_experience', [])
        for i, exp in enumerate(work_experience):
            if not cls.safe_get_str(exp, 'position'):
                errors.append(f"Work experience #{i+1}: Position is required")
            if not cls.safe_get_str(exp, 'company'):
                errors.append(f"Work experience #{i+1}: Company is required")
            if not cls.safe_get_str(exp, 'start_date'):
                errors.append(f"Work experience #{i+1}: Start date is required")
            
            # Validate date order
            date_error = cls.validate_date_order(
                cls.safe_get_str(exp, 'start_date'),
                cls.safe_get_str(exp, 'end_date'), 
                'Work experience',
                i + 1
            )
            if date_error:
                errors.append(date_error)
        
        # Validate Education - all entries should have required fields since empty ones are filtered out
        education = cv_data.get('education', [])
        for i, edu in enumerate(education):
            if not cls.safe_get_str(edu, 'institution'):
                errors.append(f"Education #{i+1}: Institution is required")
            if not cls.safe_get_str(edu, 'degree'):
                errors.append(f"Education #{i+1}: Degree is required")
            if not cls.safe_get_str(edu, 'start_date'):
                errors.append(f"Education #{i+1}: Start date is required")
            
            # Validate date order
            date_error = cls.validate_date_order(
                cls.safe_get_str(edu, 'start_date'),
                cls.safe_get_str(edu, 'end_date'),
                'Education', 
                i + 1
            )
            if date_error:
                errors.append(date_error)
        
        # Validate Projects
        projects = cv_data.get('projects', [])
        for i, project in enumerate(projects):
            if not cls.safe_get_str(project, 'name'):
                errors.append(f"Project #{i+1}: Name is required")
            if not cls.safe_get_str(project, 'description'):
                errors.append(f"Project #{i+1}: Description is required")
            
            # Validate date order
            date_error = cls.validate_date_order(
                cls.safe_get_str(project, 'start_date'),
                cls.safe_get_str(project, 'end_date'),
                'Project',
                i + 1
            )
            if date_error:
                errors.append(date_error)
        
        # Validate Awards
        awards = cv_data.get('awards', [])
        for i, award in enumerate(awards):
            if not cls.safe_get_str(award, 'name'):
                errors.append(f"Award #{i+1}: Name is required")
            if not cls.safe_get_str(award, 'issuer'):
                errors.append(f"Award #{i+1}: Issuer is required")
            if not cls.safe_get_str(award, 'date'):
                errors.append(f"Award #{i+1}: Date is required")
        
        # Validate Certifications
        certifications = cv_data.get('certifications', [])
        for i, cert in enumerate(certifications):
            if not cls.safe_get_str(cert, 'name'):
                errors.append(f"Certification #{i+1}: Name is required")
            if not cls.safe_get_str(cert, 'issuer'):
                errors.append(f"Certification #{i+1}: Issuer is required")
            if not cls.safe_get_str(cert, 'date'):
                errors.append(f"Certification #{i+1}: Date is required")
        
        # Validate Publications
        publications = cv_data.get('publications', [])
        for i, pub in enumerate(publications):
            if not cls.safe_get_str(pub, 'title'):
                errors.append(f"Publication #{i+1}: Title is required")
            if not cls.safe_get_str(pub, 'authors'):
                errors.append(f"Publication #{i+1}: Authors are required")
            if not cls.safe_get_str(pub, 'journal'):
                errors.append(f"Publication #{i+1}: Journal/Conference is required")
            if not cls.safe_get_str(pub, 'date'):
                errors.append(f"Publication #{i+1}: Date is required")
        
        # Validate Volunteer Experience
        volunteer_experience = cv_data.get('volunteer_experience', [])
        for i, volunteer in enumerate(volunteer_experience):
            if not cls.safe_get_str(volunteer, 'organization'):
                errors.append(f"Volunteer experience #{i+1}: Organization is required")
            if not cls.safe_get_str(volunteer, 'role'):
                errors.append(f"Volunteer experience #{i+1}: Role is required")
            if not cls.safe_get_str(volunteer, 'start_date'):
                errors.append(f"Volunteer experience #{i+1}: Start date is required")
        
        return errors
