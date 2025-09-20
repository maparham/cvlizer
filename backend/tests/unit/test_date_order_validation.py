"""
Unit tests for date order validation.

Tests ensure that start_date is always before end_date in CV entries.
"""

import pytest
from src.utils.validation import CVDataValidator


class TestDateOrderValidation:
    """Test date order validation logic."""

    def test_valid_date_order_work_experience(self):
        """Test that valid date order passes validation."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'work_experience': [
                {
                    'position': 'Developer',
                    'company': 'Test Co',
                    'start_date': '2020-01-01',
                    'end_date': '2021-12-31'  # After start_date - valid
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 0, f"Should not have date order errors: {date_errors}"

    def test_invalid_date_order_work_experience(self):
        """Test that invalid date order fails validation."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'work_experience': [
                {
                    'position': 'Developer',
                    'company': 'Test Co',
                    'start_date': '2021-12-31',
                    'end_date': '2020-01-01'  # Before start_date - invalid
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 1, f"Should have exactly 1 date order error: {errors}"
        assert 'Work experience #1' in date_errors[0]

    def test_valid_date_order_education(self):
        """Test that valid date order passes validation for education."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'education': [
                {
                    'institution': 'Test University',
                    'degree': 'MSc',
                    'start_date': '2018-09-01',
                    'end_date': '2020-06-30'  # After start_date - valid
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 0, f"Should not have date order errors: {date_errors}"

    def test_invalid_date_order_education(self):
        """Test that invalid date order fails validation for education."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'education': [
                {
                    'institution': 'Test University',
                    'degree': 'MSc',
                    'start_date': '2020-06-30',
                    'end_date': '2018-09-01'  # Before start_date - invalid
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 1, f"Should have exactly 1 date order error: {errors}"
        assert 'Education #1' in date_errors[0]

    def test_invalid_date_format_skips_validation(self):
        """Test that invalid date formats skip date order validation."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'work_experience': [
                {
                    'position': 'Developer',
                    'company': 'Test Co',
                    'start_date': '2020-12',  # Invalid format (missing day)
                    'end_date': '2020-06'     # Invalid format (missing day)
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 0, "Should skip date order validation for invalid date formats"

    def test_missing_end_date_skips_validation(self):
        """Test that missing end_date skips date order validation."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'work_experience': [
                {
                    'position': 'Developer',
                    'company': 'Test Co',
                    'start_date': '2020-01-01',
                    'end_date': ''  # Missing end_date - should skip date order validation
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 0, "Should skip date order validation when end_date is missing"

    def test_same_date_is_invalid(self):
        """Test that same start and end date is considered invalid."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'education': [
                {
                    'institution': 'Test University',
                    'degree': 'MSc',
                    'start_date': '2020-01-01',
                    'end_date': '2020-01-01'  # Same date - invalid
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 1, "Same start and end date should be invalid"

    def test_multiple_date_order_errors(self):
        """Test multiple date order errors in different sections."""
        cv_data = {
            'personal_info': {
                'full_name': 'Test User',
                'email': 'test@example.com',
                'location': 'Test City'
            },
            'work_experience': [
                {
                    'position': 'Developer',
                    'company': 'Test Co',
                    'start_date': '2021-01-01',
                    'end_date': '2020-01-01'  # Invalid order
                }
            ],
            'education': [
                {
                    'institution': 'Test University',
                    'degree': 'MSc',
                    'start_date': '2020-01-01',
                    'end_date': '2019-01-01'  # Invalid order
                }
            ]
        }
        
        errors = CVDataValidator.validate_business_rules(cv_data)
        date_errors = [e for e in errors if 'start date must be before end date' in e.lower()]
        assert len(date_errors) == 2, f"Should have 2 date order errors: {errors}"
        assert any('Work experience #1' in error for error in date_errors)
        assert any('Education #1' in error for error in date_errors)
