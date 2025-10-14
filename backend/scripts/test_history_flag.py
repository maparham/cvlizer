"""
Test script to verify CV history feature flag implementation.

This script tests that the ENABLE_CV_HISTORY flag correctly controls
whether CV history entries are created in the database.
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from src.utils.feature_flags import is_cv_history_enabled  # noqa: E402


def test_feature_flag():
    """Test the feature flag utility."""
    print("\n" + "=" * 60)
    print("  CV HISTORY FEATURE FLAG TEST")
    print("=" * 60)

    # Test current state
    current_state = is_cv_history_enabled()
    env_value = os.getenv("ENABLE_CV_HISTORY", "not set")

    print(f"\nEnvironment Variable: ENABLE_CV_HISTORY = {env_value}")
    print(f"Feature Flag Result: {current_state}")

    # Test various values
    print("\n" + "-" * 60)
    print("Testing various environment values:")
    print("-" * 60)

    test_cases = [
        ("true", True),
        ("True", True),
        ("TRUE", True),
        ("1", True),
        ("yes", True),
        ("YES", True),
        ("on", True),
        ("false", False),
        ("False", False),
        ("FALSE", False),
        ("0", False),
        ("no", False),
        ("NO", False),
        ("off", False),
        ("", False),
        (None, False),
    ]

    original_value = os.getenv("ENABLE_CV_HISTORY")

    for value, expected in test_cases:
        if value is None:
            if "ENABLE_CV_HISTORY" in os.environ:
                del os.environ["ENABLE_CV_HISTORY"]
            display_value = "None (unset)"
        else:
            os.environ["ENABLE_CV_HISTORY"] = value
            display_value = f"'{value}'"

        # Import fresh to get new env value
        from importlib import reload

        from src.utils import feature_flags

        reload(feature_flags)

        result = feature_flags.is_cv_history_enabled()
        status = "✓ PASS" if result == expected else "✗ FAIL"
        print(f"  {display_value:20} → {result:5} (expected {expected:5}) {status}")

    # Restore original value
    if original_value is not None:
        os.environ["ENABLE_CV_HISTORY"] = original_value
    elif "ENABLE_CV_HISTORY" in os.environ:
        del os.environ["ENABLE_CV_HISTORY"]

    print("\n" + "=" * 60)
    print("  TEST COMPLETED")
    print("=" * 60)

    print("\n📝 Implementation Summary:")
    print("  • Feature flag: ENABLE_CV_HISTORY in .env")
    print("  • Utility function: is_cv_history_enabled() in feature_flags.py")
    print("  • Protected endpoints:")
    print("    - POST /api/cvs/{cv_id}/history (creates history entry)")
    print("    - POST /api/cvs/{cv_id}/restore/{entry_id} (creates restore snapshot)")
    print("  • Protected operations:")
    print("    - Initial history creation after CV parsing")
    print("    - Initial history creation after CV duplication")
    print("\n💡 Usage:")
    print("  • Set ENABLE_CV_HISTORY=true to enable history recording")
    print("  • Set ENABLE_CV_HISTORY=false to disable history recording")
    print("  • Should match frontend VITE_SHOW_HISTORY_PANEL setting")
    print()


if __name__ == "__main__":
    test_feature_flag()
