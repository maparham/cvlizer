"""
Unit tests specifically designed to prevent phantom diff regressions.

These tests ensure that data cleaning doesn't cause phantom "removed" diffs
when users make unrelated edits.
"""

import pytest

from src.services.cv.cv_diff_service import CVDiffService
from src.utils.validation import CVDataValidator


class TestPhantomDiffPrevention:
    """Test cases to prevent phantom diff issues from returning."""

    def setup_method(self):
        """Set up test fixtures."""
        self.diff_service = CVDiffService()

        # Sample CV data that mimics the real-world issue
        self.cv_with_incomplete_education = {
            "work_experience": [
                {
                    "id": "work_1",
                    "position": "Backend Developer",
                    "company": "Test Company",
                    "start_date": "2020-01-01",
                }
            ],
            "education": [
                {
                    "id": "edu_1",
                    "institution": "University of Vienna",
                    "degree": "PhD",
                    "start_date": "2018-03-01",
                },
                {
                    "id": "edu_2",
                    "institution": "Sharif University of Technology",
                    "degree": "MSc",
                    "start_date": "",  # Missing start_date - this caused phantom deletions
                },
                {
                    "id": "edu_3",
                    "institution": "Kharazmi University",
                    "degree": "BSc",
                    "start_date": "",  # Missing start_date - this caused phantom deletions
                },
            ],
        }

    def test_education_entries_strict_validation(self):
        """Test that education entries require all mandatory fields (strict validation)."""
        # Act
        cleaned_data = CVDataValidator.clean_empty_entries(
            self.cv_with_incomplete_education
        )

        # Assert - only complete entries should be preserved
        assert (
            len(cleaned_data["education"]) == 1
        ), "Only complete education entries should be preserved"

        # Verify only the complete entry is preserved
        institutions = [edu["institution"] for edu in cleaned_data["education"]]
        assert "University of Vienna" in institutions  # This one has start_date
        assert "Sharif University of Technology" not in institutions  # Missing start_date
        assert "Kharazmi University" not in institutions  # Missing start_date

    def test_work_experience_edit_no_phantom_education_deletions(self):
        """Test that editing work experience doesn't cause phantom education deletions."""
        # Arrange - simulate user editing work experience position
        cv_after_edit = self.cv_with_incomplete_education.copy()
        cv_after_edit["work_experience"] = [
            {
                "id": "work_1",
                "position": "Backend Developeree",  # Changed position
                "company": "Test Company",
                "start_date": "2020-01-01",
            }
        ]

        # Clean both versions (simulating what happens during save)
        old_cleaned = CVDataValidator.clean_empty_entries(
            self.cv_with_incomplete_education
        )
        new_cleaned = CVDataValidator.clean_empty_entries(cv_after_edit)

        # Compute diff
        diff_result = self.diff_service.compute_diff(old_cleaned, new_cleaned)

        # Assert - should only show work experience change, no education deletions
        assert (
            diff_result["total_changes"] == 1
        ), f"Expected 1 change, got {diff_result['total_changes']}"

        change = diff_result["changes"][0]
        assert (
            change["section"] == "work_experience"
        ), "Change should be in work experience"
        assert (
            "position" in change["description"].lower()
        ), "Change should be about position"
        assert (
            "backend developer" in change["description"].lower()
        ), "Should show position change"

        # Verify no education changes
        education_changes = [
            c for c in diff_result["changes"] if c["section"] == "education"
        ]
        assert (
            len(education_changes) == 0
        ), "Should not have any phantom education deletions"

    def test_business_validation_requires_start_date(self):
        """Test that business validation requires start_date for education (strict validation restored)."""
        # Arrange
        cv_data = {
            "personal_info": {
                "full_name": "Test User",
                "email": "test@example.com",
                "location": "Test City",
            },
            "education": [
                {
                    "institution": "Test University",
                    "degree": "MSc",
                    "start_date": "",  # Empty start_date should now cause validation error
                }
            ],
        }

        # Should be removed during cleaning
        cleaned = CVDataValidator.clean_empty_entries(cv_data)
        assert (
            len(cleaned["education"]) == 0
        ), "Education without start_date should be removed during cleaning"

    def test_empty_education_entries_are_removed(self):
        """Test that incomplete education entries are removed with strict validation."""
        # Arrange
        cv_with_mixed_education = {
            "education": [
                {
                    "id": "edu_1",
                    "institution": "Valid University",
                    "degree": "MSc",
                    "start_date": "2020-01-01",  # Complete - should be kept
                },
                {
                    "id": "edu_2",
                    "institution": "",  # Empty
                    "degree": "",  # Empty
                    "start_date": "",  # Empty - should be removed
                },
            ]
        }

        # Act
        cleaned_data = CVDataValidator.clean_empty_entries(cv_with_mixed_education)

        # Assert
        assert (
            len(cleaned_data["education"]) == 1
        ), "Only complete education entry should be kept"
        assert cleaned_data["education"][0]["institution"] == "Valid University"

    def test_work_experience_still_requires_all_fields(self):
        """Test that work experience still requires position, company, and start_date."""
        # Arrange
        cv_with_incomplete_work = {
            "work_experience": [
                {
                    "id": "work_1",
                    "position": "Developer",
                    "company": "Test Co",
                    "start_date": "2020-01-01",  # Complete - should be kept
                },
                {
                    "id": "work_2",
                    "position": "Designer",
                    "company": "",  # Missing company - should be removed
                    "start_date": "2019-01-01",
                },
            ]
        }

        # Act
        cleaned_data = CVDataValidator.clean_empty_entries(cv_with_incomplete_work)

        # Assert
        assert (
            len(cleaned_data["work_experience"]) == 1
        ), "Incomplete work experience should be removed"
        assert cleaned_data["work_experience"][0]["position"] == "Developer"

    def test_diff_consistency_after_multiple_saves(self):
        """Test that multiple save cycles don't cause data drift."""
        # Arrange - simulate multiple save cycles
        original_data = self.cv_with_incomplete_education.copy()

        # Simulate 3 save cycles
        data_after_save1 = CVDataValidator.clean_empty_entries(original_data)
        data_after_save2 = CVDataValidator.clean_empty_entries(data_after_save1)
        data_after_save3 = CVDataValidator.clean_empty_entries(data_after_save2)

        # Act - compute diffs between saves
        diff_1_to_2 = self.diff_service.compute_diff(data_after_save1, data_after_save2)
        diff_2_to_3 = self.diff_service.compute_diff(data_after_save2, data_after_save3)

        # Assert - should have no changes between saves if no actual edits were made
        assert (
            diff_1_to_2["total_changes"] == 0
        ), "No changes should occur between save cycles"
        assert (
            diff_2_to_3["total_changes"] == 0
        ), "No changes should occur between save cycles"

        # Verify education count remains stable
        assert (
            len(data_after_save1["education"])
            == len(data_after_save2["education"])
            == len(data_after_save3["education"])
        )

    def test_regression_specific_case(self):
        """Test the exact scenario that caused the original phantom diff bug."""
        # Arrange - exact scenario from the bug report
        before_edit = {
            "work_experience": [
                {
                    "id": "work_1",
                    "position": "Backend Developer",
                    "company": "Test Company",
                    "start_date": "2020-01-01",
                }
            ],
            "education": [
                {
                    "id": "edu_1",
                    "institution": "Sharif University of Technology",
                    "degree": "MSc",
                    "start_date": "",  # This was causing phantom deletion
                },
                {
                    "id": "edu_2",
                    "institution": "Kharazmi University",
                    "degree": "BSc",
                    "start_date": "",  # This was causing phantom deletion
                },
            ],
        }

        # Deep copy to avoid reference sharing
        import json

        after_edit = json.loads(json.dumps(before_edit))
        after_edit["work_experience"][0][
            "position"
        ] = "Backend Developeree"  # Only change

        # Simulate the real scenario: incomplete education entries are removed during first save
        # So the "old" version should already have cleaned data (no incomplete education)
        first_save_cleaned = CVDataValidator.clean_empty_entries(
            before_edit
        )  # Removes incomplete education

        # Then user edits work experience (deep copy to avoid reference issues)
        after_edit_from_cleaned = json.loads(json.dumps(first_save_cleaned))
        after_edit_from_cleaned["work_experience"][0]["position"] = "Backend Developeree"

        # Second save cleans the data again
        second_save_cleaned = CVDataValidator.clean_empty_entries(after_edit_from_cleaned)

        # Act - compute diff between the two cleaned versions
        diff_result = self.diff_service.compute_diff(
            first_save_cleaned, second_save_cleaned
        )

        # Assert - should only show the work experience change, no phantom education deletions
        assert (
            diff_result["total_changes"] == 1
        ), f"Expected exactly 1 change, got {diff_result['total_changes']}"

        change = diff_result["changes"][0]
        assert change["section"] == "work_experience"
        assert "Backend Developer" in change["description"]
        assert "Backend Developeree" in change["description"]

        # No education changes because incomplete entries were already removed in first save
        education_changes = [
            c for c in diff_result["changes"] if c["section"] == "education"
        ]
        assert (
            len(education_changes) == 0
        ), "Should have no education changes between properly cleaned versions"


class TestValidationEdgeCases:
    """Additional edge case tests for validation logic."""

    def test_education_with_only_institution(self):
        """Test education entry with only institution (no degree)."""
        cv_data = {
            "education": [
                {
                    "id": "edu_1",
                    "institution": "Some University",
                    "degree": "",  # Missing degree
                    "start_date": "",
                }
            ]
        }

        cleaned = CVDataValidator.clean_empty_entries(cv_data)

        # Should be removed because degree is required
        assert len(cleaned["education"]) == 0

    def test_education_with_only_degree(self):
        """Test education entry with only degree (no institution)."""
        cv_data = {
            "education": [
                {
                    "id": "edu_1",
                    "institution": "",  # Missing institution
                    "degree": "MSc",
                    "start_date": "",
                }
            ]
        }

        cleaned = CVDataValidator.clean_empty_entries(cv_data)

        # Should be removed because institution is required
        assert len(cleaned["education"]) == 0

    def test_mixed_complete_and_incomplete_education(self):
        """Test mix of complete and incomplete education entries."""
        cv_data = {
            "education": [
                {
                    "id": "edu_1",
                    "institution": "Good University",
                    "degree": "PhD",
                    "start_date": "2020-01-01",  # Complete
                },
                {
                    "id": "edu_2",
                    "institution": "Another University",
                    "degree": "MSc",
                    "start_date": "",  # Missing start_date but should be kept
                },
                {
                    "id": "edu_3",
                    "institution": "",  # Missing institution
                    "degree": "BSc",
                    "start_date": "2018-01-01",  # Should be removed
                },
            ]
        }

        cleaned = CVDataValidator.clean_empty_entries(cv_data)

        # Should keep only the complete entry, remove incomplete ones
        assert len(cleaned["education"]) == 1
        institutions = [edu["institution"] for edu in cleaned["education"]]
        assert "Good University" in institutions
        assert "Another University" not in institutions  # Missing start_date
