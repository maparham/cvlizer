"""
Unit tests for CV Diff Service.

Tests the semantic diff computation logic including:
- Single field changes
- Array item additions/removals/modifications
- Text field diffs with inline highlighting
- Data normalization and cleaning
- Edge cases and error handling
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from src.services.cv_diff_service import CVDiffService, cv_diff_service


class TestCVDiffService:
    """Test suite for CVDiffService class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.diff_service = CVDiffService()
        
        # Sample CV data for testing
        self.sample_old_cv = {
            'personal_info': {
                'full_name': 'John Doe',
                'email': 'john@example.com',
                'location': 'New York, NY'
            },
            'professional_summary': {
                'content': 'Experienced software developer with 5 years of experience.'
            },
            'work_experience': [
                {
                    'id': 'work_123',
                    'company': 'TechCorp',
                    'position': 'Software Developer',
                    'location': 'San Francisco, CA',
                    'start_date': '2023-01-01',
                    'end_date': '2024-01-01',
                    'current': False,
                    'description': 'Developed web applications using React and Node.js.'
                }
            ],
            'education': [
                {
                    'id': 'edu_456',
                    'institution': 'University of California',
                    'degree': 'Bachelor of Science',
                    'field_of_study': 'Computer Science',
                    'location': 'Berkeley, CA',
                    'start_date': '2019-01-01',
                    'end_date': '2023-01-01'
                }
            ],
            'skills': {
                'technical': ['Python', 'JavaScript'],
                'soft': ['Communication', 'Leadership'],
                'languages': []
            }
        }
    
    def test_no_changes(self):
        """Test diff with identical data."""
        result = self.diff_service.compute_diff(self.sample_old_cv, self.sample_old_cv)
        
        assert result['total_changes'] == 0
        assert result['summary'] == 'No changes'
        assert len(result['changes']) == 0
    
    def test_single_field_change(self):
        """Test diff with single field modification."""
        new_cv = self.sample_old_cv.copy()
        new_cv['personal_info'] = self.sample_old_cv['personal_info'].copy()
        new_cv['personal_info']['full_name'] = 'Jane Doe'
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        assert result['total_changes'] == 1
        assert result['summary'] == '1 Change'
        assert len(result['changes']) == 1
        
        change = result['changes'][0]
        assert change['type'] == 'field_changed'
        assert change['section'] == 'personal_info'
        assert 'Full Name changed from "John Doe" to "Jane Doe"' in change['description']
        assert change['icon'] == 'edit'
        assert change['color'] == 'warning'
    
    def test_work_experience_addition(self):
        """Test adding a new work experience entry."""
        new_cv = self.sample_old_cv.copy()
        new_cv['work_experience'] = self.sample_old_cv['work_experience'].copy()
        new_cv['work_experience'].append({
            'id': 'work_789',
            'company': 'NewCorp',
            'position': 'Senior Developer',
            'location': 'Austin, TX',
            'start_date': '2024-01-01',
            'end_date': '',
            'current': True,
            'description': 'Leading development team.'
        })
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        assert result['total_changes'] == 1
        assert result['summary'] == '1 Change'
        
        change = result['changes'][0]
        assert change['type'] == 'item_added'
        assert change['section'] == 'work_experience'
        assert 'Added Senior Developer at NewCorp' in change['description']
        assert change['icon'] == 'add'
        assert change['color'] == 'success'
    
    def test_work_experience_removal(self):
        """Test removing a work experience entry."""
        new_cv = self.sample_old_cv.copy()
        new_cv['work_experience'] = []  # Remove all work experience
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        assert result['total_changes'] == 1
        assert result['summary'] == '1 Change'
        
        change = result['changes'][0]
        assert change['type'] == 'item_removed'
        assert change['section'] == 'work_experience'
        assert 'Removed Software Developer at TechCorp' in change['description']
        assert change['icon'] == 'remove'
        assert change['color'] == 'error'
    
    def test_work_experience_field_modification(self):
        """Test modifying a field in work experience."""
        new_cv = self.sample_old_cv.copy()
        new_cv['work_experience'] = [item.copy() for item in self.sample_old_cv['work_experience']]
        new_cv['work_experience'][0]['position'] = 'Senior Software Developer'
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        assert result['total_changes'] == 1
        assert result['summary'] == '1 Change'
        
        change = result['changes'][0]
        assert change['type'] == 'field_changed'
        assert change['section'] == 'work_experience'
        assert 'Position changed from "Software Developer" to "Senior Software Developer"' in change['description']
    
    def test_text_field_diff(self):
        """Test text diff generation for substantial text changes."""
        new_cv = self.sample_old_cv.copy()
        new_cv['work_experience'] = [item.copy() for item in self.sample_old_cv['work_experience']]
        new_cv['work_experience'][0]['description'] = 'Developed advanced web applications using React, Node.js, and modern frameworks. Led a team of 3 developers.'
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        assert result['total_changes'] == 1
        change = result['changes'][0]
        
        # Should detect this as a text field and generate text diff
        assert change['text_diff'] is not None
        assert 'inline_diff' in change['text_diff']
        assert change['text_diff']['old_text'] == 'Developed web applications using React and Node.js.'
        assert 'advanced' in change['text_diff']['new_text']
    
    def test_professional_summary_text_diff(self):
        """Test text diff for professional summary content."""
        new_cv = self.sample_old_cv.copy()
        new_cv['professional_summary'] = self.sample_old_cv['professional_summary'].copy()
        new_cv['professional_summary']['content'] = 'Highly experienced software developer with 7 years of experience in full-stack development.'
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        assert result['total_changes'] == 1
        change = result['changes'][0]
        
        assert 'Content text updated' in change['description']
        assert change['text_diff'] is not None
        assert change['text_diff']['stats']['additions'] > 0
    
    def test_multiple_changes(self):
        """Test diff with multiple changes across sections."""
        new_cv = self.sample_old_cv.copy()
        
        # Change personal info
        new_cv['personal_info'] = self.sample_old_cv['personal_info'].copy()
        new_cv['personal_info']['location'] = 'Los Angeles, CA'
        
        # Add work experience
        new_cv['work_experience'] = self.sample_old_cv['work_experience'].copy()
        new_cv['work_experience'].append({
            'id': 'work_999',
            'company': 'StartupCorp',
            'position': 'Tech Lead',
            'location': 'Remote',
            'start_date': '2024-01-01',
            'end_date': '',
            'current': True,
            'description': 'Leading technical architecture.'
        })
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        assert result['total_changes'] == 2
        assert result['summary'] == '2 Changes'
        
        # Should have one personal info change and one work experience addition
        sections = [change['section'] for change in result['changes']]
        assert 'personal_info' in sections
        assert 'work_experience' in sections
    
    def test_data_cleaning_consistency(self):
        """Test that data cleaning prevents phantom changes."""
        # Create data with inconsistent null/empty values
        old_cv_dirty = {
            'work_experience': [
                {
                    'id': 'work_123',
                    'company': 'TechCorp',
                    'position': 'Developer',
                    'start_date': '2023-01',
                    'end_date': None,  # null value
                    'description': ''  # empty string
                }
            ]
        }
        
        new_cv_dirty = {
            'work_experience': [
                {
                    'id': 'work_123',
                    'company': 'TechCorp',
                    'position': 'Developer',
                    'start_date': '2023-01-01',  # normalized date
                    'end_date': '',  # empty string instead of null
                    'description': None  # null instead of empty string
                }
            ]
        }
        
        result = self.diff_service.compute_diff(old_cv_dirty, new_cv_dirty)
        
        # Should only detect the meaningful date change, not the null/empty differences
        assert result['total_changes'] == 1
        change = result['changes'][0]
        assert 'Start Date changed' in change['description']
    
    def test_empty_data_handling(self):
        """Test diff with empty or missing data."""
        empty_cv = {}
        
        result = self.diff_service.compute_diff(empty_cv, self.sample_old_cv)
        
        # Should detect additions for all non-empty sections
        assert result['total_changes'] > 0
        assert any('Added' in change['description'] for change in result['changes'])
    
    def test_date_normalization(self):
        """Test that date normalization works correctly."""
        # Test the date normalization function indirectly
        old_cv = {
            'work_experience': [
                {
                    'id': 'work_123',
                    'company': 'TechCorp',
                    'position': 'Developer',
                    'start_date': '2023-11'  # incomplete date
                }
            ]
        }
        
        new_cv = {
            'work_experience': [
                {
                    'id': 'work_123',
                    'company': 'TechCorp',
                    'position': 'Developer',
                    'start_date': '2023-11-15'  # complete date
                }
            ]
        }
        
        result = self.diff_service.compute_diff(old_cv, new_cv)
        
        # Should show the actual difference
        assert result['total_changes'] == 1
        change = result['changes'][0]
        assert 'Start Date changed' in change['description']
    
    def test_skills_section_changes(self):
        """Test changes in skills section."""
        new_cv = self.sample_old_cv.copy()
        new_cv['skills'] = {
            'technical': ['Python', 'JavaScript', 'TypeScript'],  # Added TypeScript
            'soft': ['Communication'],  # Removed Leadership
            'languages': ['English', 'Spanish']  # Added languages
        }
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        # Should detect 3 separate skill changes (technical, soft, languages)
        assert result['total_changes'] == 3
        
        # Check that all changes are skills-related
        for change in result['changes']:
            assert change['section'] == 'skills'
            assert 'Skills' in change['description']
        
        # Check specific changes
        descriptions = [change['description'] for change in result['changes']]
        assert any('Technical skills - added 1 skill' in desc for desc in descriptions)
        assert any('Soft skills - removed 1 skill' in desc for desc in descriptions) 
        assert any('Languages - added 2 language' in desc for desc in descriptions)
    
    def test_section_display_names(self):
        """Test that section names are user-friendly."""
        assert self.diff_service._get_section_display_name('work_experience') == 'Work Experience'
        assert self.diff_service._get_section_display_name('personal_info') == 'Personal Information'
        assert self.diff_service._get_section_display_name('professional_summary') == 'Professional Summary'
    
    def test_field_display_names(self):
        """Test that field names are user-friendly."""
        assert self.diff_service._get_field_display_name('start_date') == 'Start Date'
        assert self.diff_service._get_field_display_name('full_name') == 'Full Name'
        assert self.diff_service._get_field_display_name('field_of_study') == 'Field of Study'
    
    def test_item_display_names(self):
        """Test item display name generation."""
        work_item = {'company': 'TechCorp', 'position': 'Developer'}
        assert self.diff_service._get_item_display_name(work_item, 'work_experience') == 'Developer at TechCorp'
        
        edu_item = {'institution': 'MIT', 'degree': 'PhD'}
        assert self.diff_service._get_item_display_name(edu_item, 'education') == 'PhD from MIT'
        
        project_item = {'name': 'My Project'}
        assert self.diff_service._get_item_display_name(project_item, 'projects') == 'My Project'
    
    def test_text_field_detection(self):
        """Test text field detection logic."""
        # Should detect text fields
        assert self.diff_service._is_text_field('description', 'Short desc', 'This is a much longer description with substantial content.')
        assert self.diff_service._is_text_field('content', 'Brief summary', 'This is a comprehensive professional summary with detailed information.')
        
        # Should not detect simple fields as text fields
        assert not self.diff_service._is_text_field('position', 'Developer', 'Senior Developer')
        assert not self.diff_service._is_text_field('company', 'TechCorp', 'NewCorp')
        assert not self.diff_service._is_text_field('start_date', '2023-01', '2023-02')
    
    def test_inline_diff_generation(self):
        """Test inline diff generation with character-level highlighting."""
        old_text = "Hello world"
        new_text = "Hello beautiful world"
        
        inline_diff = self.diff_service._generate_inline_diff(old_text, new_text)
        
        # Should contain the original text
        assert "Hello" in inline_diff
        assert "world" in inline_diff
        
        # Should highlight the inserted text
        assert 'background-color: #c8e6c9' in inline_diff
        assert 'beautiful' in inline_diff
    
    def test_word_diff_generation(self):
        """Test word-level diff generation."""
        old_text = "I am a software developer"
        new_text = "I am a senior software engineer"
        
        word_diff = self.diff_service._generate_word_diff(old_text, new_text)
        
        # Should detect word-level changes
        assert len(word_diff) > 0
        assert any('Added: senior' in change for change in word_diff)
        assert any('Changed:' in change and 'developer' in change and 'engineer' in change for change in word_diff)
    
    def test_value_formatting(self):
        """Test value formatting for display."""
        assert self.diff_service._format_value_for_display(None) == 'empty'
        assert self.diff_service._format_value_for_display('') == 'empty'
        assert self.diff_service._format_value_for_display([]) == 'empty'
        assert self.diff_service._format_value_for_display(['item1']) == 'item1'
        assert self.diff_service._format_value_for_display(['item1', 'item2']) == '2 items'
        assert self.diff_service._format_value_for_display(True) == 'Yes'
        assert self.diff_service._format_value_for_display(False) == 'No'
        assert self.diff_service._format_value_for_display('test') == 'test'
    
    def test_data_normalization(self):
        """Test data normalization for consistent comparison."""
        # Test normalize_for_comparison
        assert self.diff_service._normalize_for_comparison(None) is None
        assert self.diff_service._normalize_for_comparison('') is None
        assert self.diff_service._normalize_for_comparison([]) is None
        assert self.diff_service._normalize_for_comparison('test') == 'test'
        assert self.diff_service._normalize_for_comparison(['item']) == ['item']
    
    def test_data_cleaning_integration(self):
        """Test that data cleaning preserves diff accuracy."""
        # Test that identical data produces no changes
        result = self.diff_service.compute_diff(self.sample_old_cv, self.sample_old_cv)
        assert result['total_changes'] == 0
        
        # Test that real changes are detected
        modified_cv = json.loads(json.dumps(self.sample_old_cv))
        modified_cv['work_experience'][0]['position'] = 'Modified Position'
        
        result = self.diff_service.compute_diff(self.sample_old_cv, modified_cv)
        assert result['total_changes'] == 1
    
    def test_edge_case_missing_ids(self):
        """Test handling of items without IDs."""
        old_cv = {
            'work_experience': [
                {
                    # Missing ID
                    'company': 'TechCorp',
                    'position': 'Developer'
                }
            ]
        }
        
        new_cv = {
            'work_experience': [
                {
                    # Missing ID
                    'company': 'TechCorp',
                    'position': 'Senior Developer'
                }
            ]
        }
        
        # Should not crash and should detect some change
        result = self.diff_service.compute_diff(old_cv, new_cv)
        assert isinstance(result, dict)
        assert 'changes' in result
    
    def test_complex_nested_changes(self):
        """Test complex changes with nested modifications."""
        new_cv = self.sample_old_cv.copy()
        
        # Modify work experience
        new_cv['work_experience'] = [item.copy() for item in self.sample_old_cv['work_experience']]
        new_cv['work_experience'][0]['position'] = 'Tech Lead'
        new_cv['work_experience'][0]['description'] = 'Led development of enterprise applications using modern technologies and agile methodologies.'
        
        result = self.diff_service.compute_diff(self.sample_old_cv, new_cv)
        
        # Should detect multiple field changes in the same item
        assert result['total_changes'] == 1  # One item modified
        change = result['changes'][0]
        assert change['type'] == 'item_modified'
        assert len(change['details']) == 2  # Position and description changed
    
    def test_summary_generation(self):
        """Test summary generation for different change counts."""
        assert self.diff_service._generate_summary([]) == 'No changes'
        assert self.diff_service._generate_summary([{'type': 'test'}]) == '1 Change'
        assert self.diff_service._generate_summary([{'type': 'test1'}, {'type': 'test2'}]) == '2 Changes'
        assert self.diff_service._generate_summary([{'type': f'test{i}'} for i in range(5)]) == '5 Changes'


class TestCVDiffServiceIntegration:
    """Integration tests for CV diff service with real-world scenarios."""
    
    def test_realistic_cv_edit_scenario(self):
        """Test a realistic CV editing scenario."""
        diff_service = CVDiffService()
        
        # Realistic CV data
        original_cv = {
            'personal_info': {
                'full_name': 'Sarah Johnson',
                'email': 'sarah.johnson@email.com',
                'location': 'Seattle, WA'
            },
            'professional_summary': {
                'content': 'Software engineer with 3 years of experience in web development.'
            },
            'work_experience': [
                {
                    'id': 'work_001',
                    'company': 'Microsoft',
                    'position': 'Software Engineer',
                    'location': 'Redmond, WA',
                    'start_date': '2021-06-01',
                    'end_date': '2024-01-01',
                    'current': False,
                    'description': 'Developed cloud services using Azure and .NET.'
                }
            ]
        }
        
        # User edits: update position and add new job
        edited_cv = {
            'personal_info': {
                'full_name': 'Sarah Johnson',
                'email': 'sarah.johnson@email.com',
                'location': 'Seattle, WA'
            },
            'professional_summary': {
                'content': 'Senior software engineer with 4 years of experience in web development and cloud architecture.'
            },
            'work_experience': [
                {
                    'id': 'work_002',
                    'company': 'Google',
                    'position': 'Senior Software Engineer',
                    'location': 'Mountain View, CA',
                    'start_date': '2024-02-01',
                    'end_date': '',
                    'current': True,
                    'description': 'Leading development of distributed systems.'
                },
                {
                    'id': 'work_001',
                    'company': 'Microsoft',
                    'position': 'Software Engineer II',  # Promoted
                    'location': 'Redmond, WA',
                    'start_date': '2021-06-01',
                    'end_date': '2024-01-01',
                    'current': False,
                    'description': 'Developed cloud services using Azure and .NET.'
                }
            ]
        }
        
        result = diff_service.compute_diff(original_cv, edited_cv)
        
        # Should detect: professional summary text change, work experience addition, position change
        assert result['total_changes'] == 3
        
        # Check that changes are properly categorized
        change_types = [change['type'] for change in result['changes']]
        assert 'field_changed' in change_types  # Professional summary or position change
        assert 'item_added' in change_types     # New work experience
    
    def test_move_and_edit_detection(self):
        """Test detection of items that are both moved and edited."""
        # This is a complex scenario that was problematic in the frontend
        original_cv = {
            'work_experience': [
                {
                    'id': 'work_001',
                    'company': 'CompanyA',
                    'position': 'Developer',
                    'start_date': '2022-01-01'
                },
                {
                    'id': 'work_002', 
                    'company': 'CompanyB',
                    'position': 'Engineer',
                    'start_date': '2023-01-01'
                }
            ]
        }
        
        # Move work_002 to first position AND edit its position
        edited_cv = {
            'work_experience': [
                {
                    'id': 'work_002',
                    'company': 'CompanyB', 
                    'position': 'Senior Engineer',  # Changed
                    'start_date': '2023-01-01'
                },
                {
                    'id': 'work_001',
                    'company': 'CompanyA',
                    'position': 'Developer',
                    'start_date': '2022-01-01'
                }
            ]
        }
        
        result = CVDiffService().compute_diff(original_cv, edited_cv)
        
        # Should detect only the field change, not phantom changes from reordering
        assert result['total_changes'] == 1
        change = result['changes'][0]
        assert 'Position changed' in change['description']
        assert 'Engineer' in change['description'] and 'Senior Engineer' in change['description']


if __name__ == '__main__':
    pytest.main([__file__])
